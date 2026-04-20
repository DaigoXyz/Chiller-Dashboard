const express = require("express");
const sql = require("mssql");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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

function endPlusOne(end) {
  const d = new Date(end);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── GET /chiller/daily ───────────────────────────────────────────────────────
// Returns per-day breakdown for charts
app.get("/chiller/daily", async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res.status(400).json({ error: "start and end required (YYYY-MM-DD)" });
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(start) || !dateRe.test(end))
    return res.status(400).json({ error: "Invalid date format" });

  try {
    const db    = await getPool();
    const endDt = endPlusOne(end);

    // Q1: Foto per hari
    const qPhotos = db.request()
      .input("s1", sql.Date, start)
      .input("e1", sql.Date, endDt)
      .query(`
        SELECT
          CAST(t.dtmVisit AS DATE)      AS [tgl],
          COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId    = t.szDocId
        JOIN BOS_INV_Product p          WITH(NOLOCK) ON p.szProductId = ti.szProductId
        WHERE t.dtmVisit >= @s1 AND t.dtmVisit < @e1
          AND t.szDisplayType IN ('Regular','Reguler')
          AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
          AND EXISTS (
            SELECT 1 FROM BOS_NPN WITH(NOLOCK)
            WHERE BOSnetszProductId = p.szProductId
          )
        GROUP BY CAST(t.dtmVisit AS DATE)
        ORDER BY CAST(t.dtmVisit AS DATE)
        OPTION (MAXDOP 8, RECOMPILE)
      `);

    // Q2: Toko per hari (distinct customer per hari)
    const qStores = db.request()
      .input("s2", sql.Date, start)
      .input("e2", sql.Date, endDt)
      .query(`
        SELECT
          CAST(t.dtmVisit AS DATE)       AS [tgl],
          COUNT(DISTINCT t.szCustomerId) AS [totalStores]
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s2 AND t.dtmVisit < @e2
          AND t.szDisplayType IN ('Regular','Reguler')
        GROUP BY CAST(t.dtmVisit AS DATE)
        ORDER BY CAST(t.dtmVisit AS DATE)
        OPTION (MAXDOP 8, RECOMPILE)
      `);

    // Q3: Toko per channel per hari
    const qChannel = db.request()
      .input("s3", sql.Date, start)
      .input("e3", sql.Date, endDt)
      .query(`
        SELECT
          CAST(t.dtmVisit AS DATE)       AS [tgl],
          x.szCategory_1Desc             AS [channel],
          COUNT(DISTINCT t.szCustomerId) AS [totalStores]
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        JOIN X_VW_SAM_AR_Customer x ON x.szCustId = t.szCustomerId
        WHERE t.dtmVisit >= @s3 AND t.dtmVisit < @e3
          AND t.szDisplayType IN ('Regular','Reguler')
        GROUP BY CAST(t.dtmVisit AS DATE), x.szCategory_1Desc
        ORDER BY CAST(t.dtmVisit AS DATE)
        OPTION (MAXDOP 8, RECOMPILE)
      `);

    // Q4: Display (POI) per hari — dari AVO_SAM_Report_DisplayCompliance
    const qDisplay = db.request()
      .input("s4", sql.Date, start)
      .input("e4", sql.Date, end) // inclusive
      .query(`
        SELECT
          CAST([Tanggal Kunjungan] AS DATE) AS [tgl],
          POI,
          COUNT(DISTINCT [Link Foto])       AS [totalPhotos],
          COUNT(DISTINCT [ID Customer])     AS [totalStores]
        FROM AVO_SAM_Report_DisplayCompliance
        WHERE [Tanggal Kunjungan] BETWEEN @s4 AND @e4
          AND [Actual Facing] > 0
          AND POI IS NOT NULL AND POI <> ''
        GROUP BY CAST([Tanggal Kunjungan] AS DATE), POI
        ORDER BY CAST([Tanggal Kunjungan] AS DATE)
        OPTION (MAXDOP 8, RECOMPILE)
      `);

      // Q5: Toko & Foto per Team (Department) per hari
    const qTeam = db.request()
  .input("s5", sql.Date, start)
  .input("e5", sql.Date, endDt)
  .query(`
    SELECT
      CAST(t.dtmVisit AS DATE)       AS [tgl],
      d.szName                       AS [team],
      COUNT(DISTINCT t.szCustomerId) AS [totalStores],
      COUNT(DISTINCT ti.szImageUrl)  AS [totalPhotos]
    FROM SAM_MD_TVisibility t WITH(NOLOCK)
    JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId       = t.szDocId
    JOIN BOS_PI_Employee e          WITH(NOLOCK) ON e.szEmployeeId  = t.szSalesId
    JOIN BOS_PI_Department d        WITH(NOLOCK) ON d.szDepartmentId = e.szDepartmentId
    JOIN BOS_INV_Product p          WITH(NOLOCK) ON p.szProductId   = ti.szProductId
    WHERE t.dtmVisit >= @s5 AND t.dtmVisit < @e5
      AND t.szDisplayType IN ('Regular','Reguler')
      AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
      AND (
        d.szName LIKE '%Bima%'
        OR d.szName LIKE '%Arjuna%'
        OR d.szName LIKE '%Yudistira%'
      )
      AND EXISTS (
        SELECT 1 FROM BOS_NPN WITH(NOLOCK)
        WHERE BOSnetszProductId = p.szProductId
      )
    GROUP BY CAST(t.dtmVisit AS DATE), d.szName
    ORDER BY CAST(t.dtmVisit AS DATE)
    OPTION (MAXDOP 8, RECOMPILE)
  `);

    const [r1, r2, r3, r4, r5] = await Promise.all([qPhotos, qStores, qChannel, qDisplay, qTeam]);

    // Normalize dates to YYYY-MM-DD strings
    const fmt = (d) => (d instanceof Date ? d.toISOString().split("T")[0] : String(d));

    const photosPerDay  = r1.recordset.map((r) => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos }));
    const storesPerDay  = r2.recordset.map((r) => ({ tgl: fmt(r.tgl), totalStores: r.totalStores }));
    const channelPerDay = r3.recordset.map((r) => ({ tgl: fmt(r.tgl), channel: r.channel || "Other", totalStores: r.totalStores }));
    const displayPerDay = r4.recordset.map((r) => ({ tgl: fmt(r.tgl), poi: r.POI || "Other", totalPhotos: r.totalPhotos, totalStores: r.totalStores }));
    const teamPerDay = r5.recordset.map((r) => ({
    tgl: fmt(r.tgl),
    team: r.team || "Unknown",
    totalStores: r.totalStores,
    totalPhotos: r.totalPhotos,
    }));

    res.json({ photosPerDay, storesPerDay, channelPerDay, displayPerDay, teamPerDay });
  } catch (err) {
    console.error("❌ /chiller/daily error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Chiller backend running on http://localhost:${PORT}`));