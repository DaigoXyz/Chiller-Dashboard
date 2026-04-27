require("dotenv").config();
const app = require("./app");
const { startHealthCheck, checkHealth } = require("./config/elasticsearch");
const { startScheduler, runIncrementalSync } = require("./sync/es-scheduler");
const { fullSync } = require("./sync/es-sync");

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Chiller backend running on http://localhost:${PORT}`);

  // ─── Bootstrap Elasticsearch ──────────────────────────────────────────────
  console.log("\n📡 Initializing Elasticsearch...");

  // Start periodic health checks
  startHealthCheck();

  // Wait a bit for health check to complete
  await new Promise((r) => setTimeout(r, 2000));

  const healthy = await checkHealth();
  if (healthy) {
    console.log("✅ Elasticsearch is reachable — starting sync scheduler");

    // Start the cron scheduler (every 8 minutes)
    startScheduler();

    // Run initial sync on startup (current + prev month)
    console.log("🔄 Running initial sync...");
    runIncrementalSync()
      .then(() => console.log("✅ Initial sync completed"))
      .catch((err) => console.error("⚠️  Initial sync failed:", err.message));
  } else {
    console.log("⚠️  Elasticsearch not reachable — running in SQL-only mode");
    console.log("   Dashboard will use SQL Server queries (slower)");
    console.log("   ES sync will start automatically once ES becomes available");

    // Still start scheduler — it will skip if ES is unhealthy
    startScheduler();
  }
});