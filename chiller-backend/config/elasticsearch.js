const { Client } = require("@elastic/elasticsearch");
require("dotenv").config();

let client = null;
let healthy = false;

// ─── Concurrency Semaphore ────────────────────────────────────────────────────
// Limits parallel ES search calls to MAX_CONCURRENT to avoid circuit breaker,
// while still allowing multiple queries to run in parallel (unlike a full mutex).
const MAX_CONCURRENT = 4;
let activeSearches = 0;
const searchQueue = [];

function acquireSearchSlot() {
  return new Promise((resolve) => {
    if (activeSearches < MAX_CONCURRENT) {
      activeSearches++;
      resolve();
    } else {
      searchQueue.push(resolve);
    }
  });
}

function releaseSearchSlot() {
  if (searchQueue.length > 0) {
    const next = searchQueue.shift();
    next(); // next waiter gets the slot, activeSearches stays same
  } else {
    activeSearches--;
  }
}

// ─── Sync State Registry ───────────────────────────────────────────────────────
// Tracks per-month sync status with 3 states:
//   "syncing"  → sync in progress, requests must wait
//   "ready"    → sync completed successfully, safe to query
//   (absent)   → never synced, needs sync
//
// Key: "YYYY-MM", Value: { status: "syncing"|"ready", promise?: Promise }
const monthSyncState = new Map();

function isMonthReady(monthKey) {
  return monthSyncState.get(monthKey)?.status === "ready";
}

async function waitForMonthIfSyncing(monthKey) {
  const state = monthSyncState.get(monthKey);
  if (!state) return false;
  if (state.status === "ready") return true;
  if (state.status === "syncing" && state.promise) {
    await state.promise.catch(() => {});
    return monthSyncState.get(monthKey)?.status === "ready";
  }
  return false;
}

function beginMonthSync(monthKey) {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  monthSyncState.set(monthKey, { status: "syncing", promise });
  return { resolve, reject };
}

function markMonthReady(monthKey) {
  monthSyncState.set(monthKey, { status: "ready", promise: null });
}

function markMonthFailed(monthKey) {
  monthSyncState.delete(monthKey);
}

function monthNeedsSync(monthKey) {
  const state = monthSyncState.get(monthKey);
  return !state || (state.status !== "ready" && state.status !== "syncing");
}

// Backward compat alias (called from es-sync after successful sync)
function markMonthSynced(start) { markMonthReady(start.slice(0, 7)); }

// Returns true only if month is confirmed fully synced — no ES count check
async function hasDataForRange(start, _end) {
  return isMonthReady(start.slice(0, 7));
}

function getClient() {
  if (!client) {
    const node = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    client = new Client({ node, requestTimeout: 30000, maxRetries: 3, sniffOnStart: false });

    const origSearch = client.search.bind(client);
    client.search = async (params, options) => {
      await acquireSearchSlot();
      try { return await origSearch(params, options); }
      finally { releaseSearchSlot(); }
    };

    console.log(`📡 Elasticsearch configured: ${node}`);
  }
  return client;
}

async function checkHealth() {
  try {
    const resp = await getClient().cluster.health({ timeout: "5s" });
    healthy = resp.status === "green" || resp.status === "yellow";
    return healthy;
  } catch { healthy = false; return false; }
}

function isHealthy() { return healthy; }

let healthInterval = null;
function startHealthCheck() {
  checkHealth().then(ok => console.log(ok ? "✅ Elasticsearch healthy" : "⚠️  ES not reachable — SQL fallback"));
  healthInterval = setInterval(checkHealth, 30000);
}
function stopHealthCheck() { if (healthInterval) { clearInterval(healthInterval); healthInterval = null; } }

const INDEX = { VISITS: "chiller_visits", CUSTOMERS: "chiller_customers" };

module.exports = {
  getClient, checkHealth, isHealthy, startHealthCheck, stopHealthCheck,
  hasDataForRange, markMonthSynced,
  isMonthReady, waitForMonthIfSyncing, beginMonthSync, markMonthReady,
  markMonthFailed, monthNeedsSync,
  INDEX,
};