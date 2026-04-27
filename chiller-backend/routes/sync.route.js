const express = require("express");
const router = express.Router();
const { fullSync, syncVisits, syncCustomers, getSyncStatus } = require("../sync/es-sync");
const { getSchedulerStatus } = require("../sync/es-scheduler");

// ─── POST /sync/trigger ────────────────────────────────────────────────────────
// Trigger a full sync for a given date range
// Body: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
router.post("/trigger", async (req, res) => {
  try {
    const { start, end } = req.body || {};

    // Default to current month if not provided
    const now = new Date();
    const s = start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const e = end   || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    console.log(`🔄 Manual sync triggered: ${s} → ${e}`);
    const result = await fullSync(s, e);
    res.json({ ok: true, result });
  } catch (err) {
    console.error("❌ Manual sync error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /sync/visits ──────────────────────────────────────────────────────────
// Sync only visits for a date range
router.post("/visits", async (req, res) => {
  try {
    const { start, end, fullRebuild = true } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: "start and end required" });

    const result = await syncVisits(start, end, { fullRebuild });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /sync/customers ───────────────────────────────────────────────────────
// Sync only customer master data
router.post("/customers", async (req, res) => {
  try {
    const result = await syncCustomers();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /sync/status ───────────────────────────────────────────────────────────
// Check sync status, ES health, and document counts
router.get("/status", async (req, res) => {
  try {
    const [esStatus, schedulerStatus] = await Promise.all([
      getSyncStatus(),
      Promise.resolve(getSchedulerStatus()),
    ]);
    res.json({ es: esStatus, scheduler: schedulerStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
