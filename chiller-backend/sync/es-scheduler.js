const cron = require("node-cron");
const { syncVisits, syncCustomers } = require("./es-sync");
const { isHealthy, monthNeedsSync } = require("../config/elasticsearch");

let running = false;
let lastSyncAt = null;
let lastSyncResult = null;

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

function getPrevMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

/**
 * Warm-up: sync current + prev month to completion before accepting traffic.
 * Called once on server start. Awaitable so server.js can wait on it.
 */
async function warmUp() {
  if (!isHealthy()) {
    console.log("⚠️  ES not healthy, skipping warm-up");
    return;
  }

  const curr = getCurrentMonthRange();
  const prev = getPrevMonthRange();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔥 ES Warm-up: syncing ${prev.start} and ${curr.start}`);
  console.log(`${"═".repeat(60)}`);

  // Sync sequentially so logs are clean and SQL isn't hammered in parallel
  try {
    await syncVisits(prev.start, prev.end, { fullRebuild: false });
    await syncVisits(curr.start, curr.end, { fullRebuild: false });
    await syncCustomers();
    console.log(`✅ Warm-up complete — ES is ready to serve requests\n`);
  } catch (err) {
    console.error("❌ Warm-up failed:", err.message);
    console.log("   Requests will fall back to SQL until next sync cycle\n");
  }
}

async function runIncrementalSync() {
  if (running) { console.log("⏳ Sync already in progress, skipping..."); return; }
  if (!isHealthy()) { console.log("⚠️  ES not healthy, skipping sync"); return; }

  running = true;
  try {
    const curr = getCurrentMonthRange();
    const prev = getPrevMonthRange();

    console.log(`\n${"═".repeat(60)}`);
    console.log(`🕐 Scheduled sync at ${new Date().toISOString()}`);
    console.log(`${"═".repeat(60)}`);

    const r1 = await syncVisits(curr.start, curr.end, { fullRebuild: false });
    const r2 = await syncVisits(prev.start, prev.end, { fullRebuild: false });
    const r3 = await syncCustomers();

    lastSyncAt = new Date().toISOString();
    lastSyncResult = { currentMonth: r1, prevMonth: r2, customers: r3 };
    console.log(`✅ Scheduled sync complete\n`);
  } catch (err) {
    console.error("❌ Scheduled sync failed:", err.message);
    lastSyncResult = { error: err.message };
  } finally { running = false; }
}

let task = null;

function startScheduler() {
  task = cron.schedule("*/15 * * * *", runIncrementalSync, { scheduled: true, timezone: "Asia/Jakarta" });
  console.log("⏰ ES sync scheduler started (every 15 minutes)");
}

function stopScheduler() { if (task) { task.stop(); task = null; } }

function getSchedulerStatus() {
  return { running, lastSyncAt, lastSyncResult, schedulerActive: task !== null };
}

module.exports = { startScheduler, stopScheduler, runIncrementalSync, warmUp, getSchedulerStatus };