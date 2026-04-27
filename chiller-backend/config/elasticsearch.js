const { Client } = require("@elastic/elasticsearch");
require("dotenv").config();

let client = null;
let healthy = false;
let esLock = Promise.resolve();

// Tracks which month-keys ("2026-02", "2026-03") have been confirmed present in ES
const syncedMonths = new Set();

function getClient() {
  if (!client) {
    const node = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    client = new Client({ node, requestTimeout: 30000, maxRetries: 3, sniffOnStart: false });

    // Mutex on search — prevents concurrent heavy aggregations from tripping the circuit breaker
    const origSearch = client.search.bind(client);
    client.search = async (params, options) => {
      const prev = esLock;
      let release;
      esLock = new Promise(r => (release = r));
      await prev;
      try { return await origSearch(params, options); }
      finally { release(); }
    };

    console.log(`📡 Elasticsearch configured: ${node}`);
  }
  return client;
}

// Health check
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

// Returns true if ES has > 0 docs for the given date range
async function hasDataForRange(start, end) {
  const monthKey = start.slice(0, 7);
  if (syncedMonths.has(monthKey)) return true;

  try {
    const endDt = new Date(end);
    endDt.setDate(endDt.getDate() + 1);
    const resp = await getClient().count({
      index: INDEX.VISITS,
      body: { query: { range: { visitDate: { gte: start, lt: endDt.toISOString().split("T")[0] } } } },
    });
    if (resp.count > 0) { syncedMonths.add(monthKey); return true; }
    return false;
  } catch { return false; }
}

function markMonthSynced(start) { syncedMonths.add(start.slice(0, 7)); }

const INDEX = { VISITS: "chiller_visits", CUSTOMERS: "chiller_customers" };

module.exports = { getClient, checkHealth, isHealthy, startHealthCheck, stopHealthCheck, hasDataForRange, markMonthSynced, INDEX };
