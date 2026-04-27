const express = require("express");
const cors = require("cors");
const chillerRoute  = require("./routes/chiller.route");
const overviewRoute = require("./routes/overview.route");
const syncRoute     = require("./routes/sync.route");
const { isHealthy } = require("./config/elasticsearch");

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "ngrok-skip-browser-warning",
    "x-requested-with",
  ],
  credentials: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

app.get("/health", (_req, res) => res.json({
  ok: true,
  elasticsearch: isHealthy() ? "connected" : "disconnected (SQL fallback)",
  mode: isHealthy() ? "elasticsearch" : "sql-server",
}));

app.use("/chiller",  chillerRoute);
app.use("/overview", overviewRoute);
app.use("/sync",     syncRoute);

module.exports = app;