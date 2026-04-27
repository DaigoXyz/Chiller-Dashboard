const chillerService = require("../services/chiller.service");

const getDaily = async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res.status(400).json({ error: "start and end required (YYYY-MM-DD)" });
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(start) || !dateRe.test(end))
    return res.status(400).json({ error: "Invalid date format" });

  try {
    const data = await chillerService.getDailyStats(start, end);
    res.json(data);
  } catch (err) {
    console.error("❌ /chiller/daily error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDaily
};
