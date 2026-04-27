const overviewService = require("../services/overview.service");

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function validateDates(res, ...dates) {
  for (const d of dates) {
    if (!d) return res.status(400).json({ error: "Missing required date parameter (YYYY-MM-DD)" });
    if (!dateRe.test(d)) return res.status(400).json({ error: `Invalid date format: ${d}` });
  }
  return null;
}

const getDaily = async (req, res) => {
  const { start, end, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  try { res.json(await overviewService.getDailyStats(start, end, region, channel)); }
  catch (err) { console.error("❌ /overview/daily:", err.message); res.status(500).json({ error: err.message }); }
};

const getOverview = async (req, res) => {
  const { start, end, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  try { res.json(await overviewService.getOverview(start, end, region, channel)); }
  catch (err) { console.error("❌ /overview/overview:", err.message); res.status(500).json({ error: err.message }); }
};

const getPerformance = async (req, res) => {
  const { start, end, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  try { res.json(await overviewService.getPerformanceComparison(start, end, region, channel)); }
  catch (err) { console.error("❌ /overview/performance:", err.message); res.status(500).json({ error: err.message }); }
};

const getSalesman = async (req, res) => {
  const { start, end, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  try { res.json(await overviewService.getSalesmanRanking(start, end, region, channel)); }
  catch (err) { console.error("❌ /overview/salesman:", err.message); res.status(500).json({ error: err.message }); }
};

const getOutletRisk = async (req, res) => {
  const { start, end, weekStart, weekEnd, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  if ((weekStart && !dateRe.test(weekStart)) || (weekEnd && !dateRe.test(weekEnd)))
    return res.status(400).json({ error: "Invalid weekStart/weekEnd format" });
  try { res.json(await overviewService.getOutletRisk(start, end, weekStart, weekEnd, region, channel)); }
  catch (err) { console.error("❌ /overview/outlet-risk:", err.message); res.status(500).json({ error: err.message }); }
};

const getTrend = async (req, res) => {
  const { start, end, region, channel } = req.query;
  if (validateDates(res, start, end)) return;
  try { res.json(await overviewService.getDailyTrend(start, end, region, channel)); }
  catch (err) { console.error("❌ /overview/trend:", err.message); res.status(500).json({ error: err.message }); }
};

const getFilters = async (req, res) => {
  try { res.json(await overviewService.getFilters()); }
  catch (err) { console.error("❌ /overview/filters:", err.message); res.status(500).json({ error: err.message }); }
};

const getAllSalesman = async (req, res) => {
  const { start, end, region, channel, sortBy = "top", page = 1, limit = 20, search = "" } = req.query;
  if (validateDates(res, start, end)) return;
  try {
    res.json(await overviewService.getAllSalesmanRanking(
      start, end, region, channel, sortBy, parseInt(page), parseInt(limit), search
    ));
  } catch (err) { console.error("❌ /overview/salesman/all:", err.message); res.status(500).json({ error: err.message }); }
};

const getAllNotVisited = async (req, res) => {
  const { start, end, region, channel, page = 1, limit = 20, search = "" } = req.query;
  if (validateDates(res, start, end)) return;
  try {
    res.json(await overviewService.getAllNotVisitedOutlets(
      start, end, region, channel, parseInt(page), parseInt(limit), search
    ));
  } catch (err) { console.error("❌ /overview/outlet-risk/not-visited/all:", err.message); res.status(500).json({ error: err.message }); }
};

const getAllLowPhoto = async (req, res) => {
  const { start, end, region, channel, page = 1, limit = 20, search = "" } = req.query;
  if (validateDates(res, start, end)) return;
  try {
    res.json(await overviewService.getAllLowPhotoOutlets(
      start, end, region, channel, parseInt(page), parseInt(limit), search
    ));
  } catch (err) { console.error("❌ /overview/outlet-risk/low-photo/all:", err.message); res.status(500).json({ error: err.message }); }
};

const getAllDouble = async (req, res) => {
  const { start, end, region, channel, page = 1, limit = 20, search = "" } = req.query;
  if (validateDates(res, start, end)) return;
  try {
    res.json(await overviewService.getAllDoubleOutlets(
      start, end, region, channel, parseInt(page), parseInt(limit), search
    ));
  } catch (err) { console.error("❌ /overview/outlet-risk/double/all:", err.message); res.status(500).json({ error: err.message }); }
};

module.exports = {
  getDaily, getOverview, getPerformance, getSalesman, getOutletRisk, getTrend, getFilters, getAllSalesman, getAllNotVisited, getAllLowPhoto, getAllDouble,
};