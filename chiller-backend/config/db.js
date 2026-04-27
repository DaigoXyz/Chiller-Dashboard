const sql = require("mssql");
require("dotenv").config();

function parseConnectionString(cs) {
  const map = {};
  cs.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim().toLowerCase().replace(/ /g, "");
    const val = part.slice(idx + 1).trim();
    map[key] = val;
  });
  const serverPart = map["server"] || map["datasource"] || "localhost";
  const [serverHost, serverPort] = serverPart.split(",");
  return {
    server: serverHost,
    port: serverPort ? parseInt(serverPort) : 1433,
    database: map["database"] || map["initialcatalog"],
    user: map["userid"] || map["uid"] || map["user"],
    password: map["password"] || map["pwd"],
    options: {
      trustServerCertificate: (map["trustservercertificate"] || "false").toLowerCase() === "true",
      encrypt: (map["encrypt"] || "false").toLowerCase() === "true",
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 120000,
  };
}

let pool;
async function getPool() {
  if (!pool) {
    const config = parseConnectionString(process.env.SQL_CONNECTION_STRING);
    pool = await sql.connect(config);
    console.log("✅ Connected to SQL Server");
  }
  return pool;
}

module.exports = { getPool };
