const express = require("express");
const router = express.Router();
const chillerController = require("../controllers/chiller.controller");

router.get("/daily", chillerController.getDaily);

module.exports = router;
