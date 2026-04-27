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
router.get("/salesman/all", c.getAllSalesman);
router.get("/outlet-risk/not-visited/all", c.getAllNotVisited);
router.get("/outlet-risk/low-photo/all", c.getAllLowPhoto);
router.get("/outlet-risk/double/all", c.getAllDouble);

module.exports = router;