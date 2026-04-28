require("dotenv").config();
const app = require("./app");
const { startHealthCheck, checkHealth } = require("./config/elasticsearch");
const { startScheduler, warmUp } = require("./sync/es-scheduler");

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Chiller backend running on http://localhost:${PORT}`);

  console.log("\n📡 Initializing Elasticsearch...");
  startHealthCheck();

  await new Promise((r) => setTimeout(r, 2000));

  const healthy = await checkHealth();
  if (healthy) {
    console.log("✅ Elasticsearch is reachable — running warm-up sync...");
    console.log("   (requests will fall back to SQL until warm-up completes)\n");

    await warmUp();

    startScheduler();
  } else {
    console.log("⚠️  Elasticsearch not reachable — running in SQL-only mode");
    console.log("   ES sync will start automatically once ES becomes available");
    startScheduler();
  }
});