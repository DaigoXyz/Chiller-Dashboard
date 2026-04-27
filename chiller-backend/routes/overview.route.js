const express = require("express");
const router = express.Router();
const c = require("../controllers/overview.controller");

router.get("/daily", c.getDaily);
router.get("/overview", c.getOverview);
router.get("/performance", c.getPerformance);
router.get("/salesman", c.getSalesman);
router.get("/outlet-risk", c.getOutletRisk);
router.get("/trend", c.getTrend);
router.get("/filters", c.getFilters);

module.exports = router;