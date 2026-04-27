const { getPool } = require("../config/db");
const sql = require("mssql");

const getDailyData = async (start, end, endDt) => {
  const db = await getPool();

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

  return Promise.all([qPhotos, qStores, qChannel, qDisplay, qTeam]);
};

module.exports = {
  getDailyData
};
