const { getPool } = require("../config/db");
const sql = require("mssql");

const req = (db) => db.request();

function endPlusOne(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const NPN_EXISTS = `EXISTS (SELECT 1 FROM BOS_NPN n WITH(NOLOCK) WHERE n.BOSnetszProductId = ti.szProductId)`;
const ACTIVE_OUTLET_FILTER = `szActivityStatus IN ('ACT', 'NEW') AND szStatus IN ('ACT', 'FDE')`;

function getCustomerFilter(region, channel, alias = "t.szCustomerId") {
  let filter = "";

  if (region && region !== "All") filter += " AND r.szRegionName = @region";
  if (channel && channel !== "All") filter += " AND c.szCategory_1Desc = @channel";
  if (!filter) return "";

  const needsRegion = region && region !== "All";
  if (needsRegion) {
    return ` AND EXISTS (
      SELECT 1 FROM X_VW_SAM_AR_Customer c WITH(NOLOCK)
      JOIN BOS_PI_Employee e WITH(NOLOCK) ON e.szEmployeeId = c.szSalesId
      JOIN VW_Region r WITH(NOLOCK) ON r.szWorkplaceId = e.szWorkplaceId
      WHERE c.szCustId = ${alias} ${filter}
    )`;
  }

  return ` AND EXISTS (SELECT 1 FROM X_VW_SAM_AR_Customer c WITH(NOLOCK) WHERE c.szCustId = ${alias} ${filter})`;
}

function bindCustomerParams(request, region, channel) {
  if (region && region !== "All") request.input("region", sql.VarChar, region);
  if (channel && channel !== "All") request.input("channel", sql.VarChar, channel);
  return request;
}

const getOverviewStats = async (start, end, prevStart, prevEnd, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const prevEndDt = endPlusOne(prevEnd);

  const filterSql = getCustomerFilter(region, channel);

  const qTotalFoto = bindCustomerParams(req(db), region, channel)
    .input("s",  sql.Date, start).input("e",  sql.Date, endDt)
    .input("ps", sql.Date, prevStart).input("pe", sql.Date, prevEndDt)
    .query(`
      SELECT
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @s  AND t.dtmVisit < @e  THEN ti.szImageUrl END) AS [current],
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @ps AND t.dtmVisit < @pe THEN ti.szImageUrl END) AS [prev]
      FROM SAM_MD_TVisibilityItem ti WITH(NOLOCK)
      JOIN SAM_MD_TVisibility t  WITH(NOLOCK) ON t.szDocId          = ti.szDocId
      WHERE t.szDisplayType IN ('Regular','Reguler')
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        AND (
          (t.dtmVisit >= @s  AND t.dtmVisit < @e)
          OR (t.dtmVisit >= @ps AND t.dtmVisit < @pe)
        )
        ${filterSql}
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  let totalOutletFilter = "";
  let totalOutletJoin = "";
  if (channel && channel !== "All") totalOutletFilter += " AND c2.szCategory_1Desc = @channel";
  if (region && region !== "All") {
    totalOutletJoin = `
      JOIN BOS_PI_Employee e2 WITH(NOLOCK) ON e2.szEmployeeId = c2.szSalesId
      JOIN VW_Region r2 WITH(NOLOCK) ON r2.szWorkplaceId = e2.szWorkplaceId`;
    totalOutletFilter += " AND r2.szRegionName = @region";
  }

  const qCoverage = bindCustomerParams(req(db), region, channel)
    .input("s",  sql.Date, start).input("e",  sql.Date, endDt)
    .input("ps", sql.Date, prevStart).input("pe", sql.Date, prevEndDt)
    .query(`
      SELECT
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @s  AND t.dtmVisit < @e  THEN t.szCustomerId END) AS [visitedCurrent],
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @ps AND t.dtmVisit < @pe THEN t.szCustomerId END) AS [visitedPrev],
        (
          SELECT COUNT(DISTINCT c2.szCustId)
          FROM X_VW_SAM_AR_Customer c2 WITH(NOLOCK)
          ${totalOutletJoin}
          WHERE c2.szActivityStatus IN ('ACT', 'NEW') 
            AND c2.szStatus IN ('ACT', 'FDE')
            ${totalOutletFilter}
        ) AS [totalOutlet]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      WHERE t.szDisplayType IN ('Regular','Reguler')
        AND (
          (t.dtmVisit >= @s  AND t.dtmVisit < @e)
          OR (t.dtmVisit >= @ps AND t.dtmVisit < @pe)
        )
        ${filterSql}
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qSalesman = bindCustomerParams(req(db), region, channel)
    .input("s",  sql.Date, start).input("e",  sql.Date, endDt)
    .input("ps", sql.Date, prevStart).input("pe", sql.Date, prevEndDt)
    .query(`
      SELECT
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @s  AND t.dtmVisit < @e  THEN t.szSalesId END) AS [activeCurrent],
        COUNT(DISTINCT CASE WHEN t.dtmVisit >= @ps AND t.dtmVisit < @pe THEN t.szSalesId END) AS [activePrev],
        (SELECT COUNT(DISTINCT szEmployeeId) FROM BOS_PI_Employee WITH(NOLOCK) WHERE bActive = 1) AS [totalSalesman]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      WHERE t.szDisplayType IN ('Regular','Reguler')
        AND (
          (t.dtmVisit >= @s  AND t.dtmVisit < @e)
          OR (t.dtmVisit >= @ps AND t.dtmVisit < @pe)
        )
        ${filterSql}
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  return Promise.all([qTotalFoto, qCoverage, qSalesman]);
};


const getTotalDistinctPhotos = async (start, end, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);

  const result = await bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      SELECT COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId = t.szDocId
      WHERE t.szDisplayType IN ('Regular','Reguler')
        AND t.dtmVisit >= @s AND t.dtmVisit < @e
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        ${filterSql}
      OPTION (MAXDOP 8, RECOMPILE)
    `);
  return result.recordset[0].totalPhotos;
};


const getPhotoByChannel = async (start, end, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);

  return bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ;WITH VisitBase AS (
        SELECT t.szDocId, t.szCustomerId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
          ${filterSql}
      )
      SELECT TOP 20
        ISNULL(x.szCategory_1Desc, 'Lainnya') AS [channel],
        COUNT(DISTINCT ti.szImageUrl)          AS [totalPhotos],
        COUNT(DISTINCT vb.szCustomerId)        AS [totalStores]
      FROM VisitBase vb
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = vb.szDocId
      JOIN X_VW_SAM_AR_Customer   x  WITH(NOLOCK) ON x.szCustId          = vb.szCustomerId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
      GROUP BY x.szCategory_1Desc
      ORDER BY totalPhotos DESC
      OPTION (MAXDOP 8, RECOMPILE)
    `);
};


const getPhotoByTeam = async (start, end, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);

  return bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ;WITH VisitBase AS (
        SELECT t.szDocId, t.szSalesId, t.szCustomerId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
          ${filterSql}
      )
      SELECT
        d.szName                        AS [team],
        COUNT(DISTINCT ti.szImageUrl)   AS [totalPhotos],
        COUNT(DISTINCT vb.szCustomerId) AS [totalStores]
      FROM VisitBase vb
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = vb.szDocId
      JOIN BOS_PI_Employee        e  WITH(NOLOCK) ON e.szEmployeeId      = vb.szSalesId
      JOIN BOS_PI_Department      d  WITH(NOLOCK) ON d.szDepartmentId    = e.szDepartmentId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        AND (d.szName LIKE '%Bima%' OR d.szName LIKE '%Arjuna%' OR d.szName LIKE '%Yudistira%')
      GROUP BY d.szName
      ORDER BY totalPhotos DESC
      OPTION (MAXDOP 8, RECOMPILE)
    `);
};


const getPhotoByBrand = async (start, end, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);

  return bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ;WITH VisitBase AS (
        SELECT t.szDocId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
          ${filterSql}
      )
      SELECT TOP 10
        n.szCat1Description AS [brand],
        COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM VisitBase vb
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId = vb.szDocId
      JOIN BOS_NPN n WITH(NOLOCK) ON n.BOSnetszProductId = ti.szProductId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND n.szCat1Description IS NOT NULL AND n.szCat1Description <> ''
      GROUP BY n.szCat1Description
      ORDER BY totalPhotos DESC
      OPTION (MAXDOP 8, RECOMPILE)
    `);
};


const getSalesmanRanking = async (start, end, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);

  let totalOutletFilter = "";

  if (channel && channel !== "All") totalOutletFilter += " AND szCategory_1Desc = @channel";

  const baseCTE = `
    ;WITH VisitBase AS (
      SELECT t.szDocId, t.szSalesId, t.szCustomerId
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
        AND t.szDisplayType IN ('Regular','Reguler')
        ${filterSql}
    ),
    SalesVisit AS (
      SELECT
        szSalesId,
        COUNT(DISTINCT szCustomerId) AS [visitedOutlets]
      FROM VisitBase
      GROUP BY szSalesId
    ),
    ValidPhotos AS (
      SELECT vb.szSalesId, ti.szImageUrl
      FROM VisitBase vb
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = vb.szDocId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
    ),
    PhotoCount AS (
      SELECT szSalesId, COUNT(DISTINCT szImageUrl) AS [totalPhotos]
      FROM ValidPhotos
      GROUP BY szSalesId
    ),
    SalesAssigned AS (
      SELECT szSalesId, COUNT(DISTINCT szCustId) AS [totalAssignedOutlets]
      FROM X_VW_SAM_AR_Customer WITH(NOLOCK)
      WHERE ${ACTIVE_OUTLET_FILTER} ${totalOutletFilter}
      GROUP BY szSalesId
    ),
    SalesActivity AS (
      SELECT
        sv.szSalesId,
        e.szName                  AS [salesman],
        d.szName                  AS [team],
        ISNULL(pc.totalPhotos, 0) AS [totalPhotos],
        sv.visitedOutlets         AS [visitedOutlets],
        ISNULL(sa.totalAssignedOutlets, sv.visitedOutlets) AS [totalAssignedOutlets],
        CASE 
          WHEN ISNULL(sa.totalAssignedOutlets, 0) = 0 THEN 100.0
          WHEN sv.visitedOutlets > sa.totalAssignedOutlets THEN 100.0
          ELSE ROUND(CAST(sv.visitedOutlets AS FLOAT) / sa.totalAssignedOutlets * 100, 1)
        END                       AS [outletCoverage]
      FROM SalesVisit sv
      JOIN BOS_PI_Employee   e WITH(NOLOCK) ON e.szEmployeeId   = sv.szSalesId
      JOIN BOS_PI_Department d WITH(NOLOCK) ON d.szDepartmentId = e.szDepartmentId
      LEFT JOIN PhotoCount   pc            ON pc.szSalesId      = sv.szSalesId
      LEFT JOIN SalesAssigned sa           ON sa.szSalesId      = sv.szSalesId
    )
  `;

  const qTop = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ${baseCTE}
      SELECT TOP 5 salesman, team, totalPhotos, visitedOutlets, totalAssignedOutlets, outletCoverage
      FROM SalesActivity
      ORDER BY totalPhotos DESC
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qBottom = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ${baseCTE}
      SELECT TOP 5 salesman, team, totalPhotos, visitedOutlets, totalAssignedOutlets, outletCoverage
      FROM SalesActivity
      ORDER BY totalPhotos ASC
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const [rTop, rBottom] = await Promise.all([qTop, qBottom]);

  return {
    top5:    rTop.recordset,
    bottom5: rBottom.recordset,
  };
};

const getAllSalesmanRanking = async (start, end, region, channel, sortBy = "top", page = 1, limit = 20, search = "") => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);
  const offset = (page - 1) * limit;
 
  let totalOutletFilter = "";
  if (channel && channel !== "All") totalOutletFilter += " AND szCategory_1Desc = @channel";
 
  const orderDir = sortBy === "bottom" ? "ASC" : "DESC";
 
  // Jika bottom, kita filter yang totalPhotos > 0 (sama seperti logika di getSalesmanRanking)
  const searchTrim = (search || "").trim();
  const searchFilter = searchTrim ? "AND (e.szName LIKE @search OR e.szEmployeeId LIKE @search)" : "";
  const bottomFilter = sortBy === "bottom"
    ? `WHERE totalPhotos > 0 ${searchTrim ? "AND (salesman LIKE @search OR szSalesId LIKE @search)" : ""}`
    : searchTrim ? "WHERE (salesman LIKE @search OR szSalesId LIKE @search)" : "";
 
  const baseCTE = `
    ;WITH VisitBase AS (
      SELECT t.szDocId, t.szSalesId, t.szCustomerId
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
        AND t.szDisplayType IN ('Regular','Reguler')
        ${filterSql}
    ),
    SalesVisit AS (
      SELECT
        szSalesId,
        COUNT(DISTINCT szCustomerId) AS [visitedOutlets]
      FROM VisitBase
      GROUP BY szSalesId
    ),
    ValidPhotos AS (
      SELECT vb.szSalesId, ti.szImageUrl
      FROM VisitBase vb
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId = vb.szDocId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
    ),
    PhotoCount AS (
      SELECT szSalesId, COUNT(DISTINCT szImageUrl) AS [totalPhotos]
      FROM ValidPhotos
      GROUP BY szSalesId
    ),
    SalesAssigned AS (
      SELECT szSalesId, COUNT(DISTINCT szCustId) AS [totalAssignedOutlets]
      FROM X_VW_SAM_AR_Customer WITH(NOLOCK)
      WHERE ${ACTIVE_OUTLET_FILTER} ${totalOutletFilter}
      GROUP BY szSalesId
    ),
    SalesActivity AS (
      SELECT
        sv.szSalesId,
        e.szName                  AS [salesman],
        d.szName                  AS [team],
        ISNULL(pc.totalPhotos, 0) AS [totalPhotos],
        sv.visitedOutlets         AS [visitedOutlets],
        ISNULL(sa.totalAssignedOutlets, sv.visitedOutlets) AS [totalAssignedOutlets],
        CASE 
          WHEN ISNULL(sa.totalAssignedOutlets, 0) = 0 THEN 100.0
          WHEN sv.visitedOutlets > sa.totalAssignedOutlets THEN 100.0
          ELSE ROUND(CAST(sv.visitedOutlets AS FLOAT) / sa.totalAssignedOutlets * 100, 1)
        END                       AS [outletCoverage]
      FROM SalesVisit sv
      JOIN BOS_PI_Employee   e WITH(NOLOCK) ON e.szEmployeeId   = sv.szSalesId
      JOIN BOS_PI_Department d WITH(NOLOCK) ON d.szDepartmentId = e.szDepartmentId
      LEFT JOIN PhotoCount   pc            ON pc.szSalesId      = sv.szSalesId
      LEFT JOIN SalesAssigned sa           ON sa.szSalesId      = sv.szSalesId
    ),
    Filtered AS (
      SELECT * FROM SalesActivity
      ${bottomFilter}
    ),
    TotalCount AS (
      SELECT COUNT(*) AS [totalRows] FROM Filtered
    )
  `;
 
  const qBuilder = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start)
    .input("e", sql.Date, endDt)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  if (searchTrim) qBuilder.input("search", sql.VarChar, `%${searchTrim}%`);

  const result = await qBuilder.query(`
      ${baseCTE}
      SELECT
        f.salesman, f.team, f.totalPhotos, f.visitedOutlets,
        f.totalAssignedOutlets, f.outletCoverage,
        tc.totalRows
      FROM Filtered f
      CROSS JOIN TotalCount tc
      ORDER BY f.totalPhotos ${orderDir}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 8, RECOMPILE)
    `);
 
  const totalRows = result.recordset[0]?.totalRows || 0;
  return {
    data: result.recordset.map(({ totalRows: _, ...row }) => row),
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};


const riskCache = new Map();
const RISK_CACHE_TTL = 15 * 60 * 1000;

const getOutletRisk = async (start, end, weekStart, weekEnd, region, channel) => {
  const cacheKey = `${start}_${end}_${weekStart}_${weekEnd}_${region}_${channel}`;
  if (riskCache.has(cacheKey)) {
    const cached = riskCache.get(cacheKey);
    if (Date.now() - cached.timestamp < RISK_CACHE_TTL) {
      return cached.data;
    }
  }

  const db = await getPool();
  const endDt = endPlusOne(end);
  const weekEndDt = endPlusOne(weekEnd);
  const filterSql = getCustomerFilter(region, channel);
  const NPN_EXISTS = `EXISTS (SELECT 1 FROM BOS_NPN n WITH(NOLOCK) WHERE n.BOSnetszProductId = ti.szProductId)`;

  let totalOutletFilter = "";
  if (channel && channel !== "All") totalOutletFilter += " AND szCategory_1Desc = @channel";

  const qNotVisitedCount = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start).input("e", sql.Date, endDt)
    .query(`
      ;WITH ActiveAssigned AS (
        SELECT DISTINCT szCustId FROM X_VW_SAM_AR_Customer WITH(NOLOCK)
        WHERE ${ACTIVE_OUTLET_FILTER} ${totalOutletFilter}
          AND szSalesId IS NOT NULL AND szSalesId <> ''
      )
      SELECT COUNT(*) AS [totalCount]
      FROM ActiveAssigned a
      LEFT JOIN SAM_MD_TVisibility t WITH(NOLOCK)
        ON t.szCustomerId = a.szCustId AND t.dtmVisit >= @s AND t.dtmVisit < @e
        AND t.szDisplayType IN ('Regular','Reguler')
      WHERE t.szDocId IS NULL
      OPTION (MAXDOP 4)
    `);

  const qNotVisitedList = bindCustomerParams(req(db), region, channel)
    .input("s2", sql.Date, start).input("e2", sql.Date, endDt)
    .query(`
      ;WITH ActiveAssigned AS (
        SELECT DISTINCT szCustId, szName FROM X_VW_SAM_AR_Customer WITH(NOLOCK)
        WHERE ${ACTIVE_OUTLET_FILTER} ${totalOutletFilter}
          AND szSalesId IS NOT NULL AND szSalesId <> ''
      )
      SELECT TOP 5 a.szCustId AS [customerId], a.szName AS [customerName]
      FROM ActiveAssigned a
      LEFT JOIN SAM_MD_TVisibility t WITH(NOLOCK)
        ON t.szCustomerId = a.szCustId AND t.dtmVisit >= @s2 AND t.dtmVisit < @e2
        AND t.szDisplayType IN ('Regular','Reguler')
      WHERE t.szDocId IS NULL
      ORDER BY a.szName
      OPTION (MAXDOP 4)
    `);

  const qLowPhotoCount = bindCustomerParams(req(db), region, channel)
    .input("s3", sql.Date, start).input("e3", sql.Date, endDt)
    .query(`
      ;WITH PC AS (
        SELECT t.szCustomerId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId = t.szDocId
        WHERE t.dtmVisit >= @s3 AND t.dtmVisit < @e3
          AND t.szDisplayType IN ('Regular','Reguler')
          AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
          AND ${NPN_EXISTS} ${filterSql}
        GROUP BY t.szCustomerId
        HAVING COUNT(DISTINCT ti.szImageUrl) < 3
      )
      SELECT COUNT(*) AS [totalCount] FROM PC
      OPTION (MAXDOP 4)
    `);

  const qLowPhotoList = bindCustomerParams(req(db), region, channel)
    .input("s4", sql.Date, weekStart).input("e4", sql.Date, weekEndDt)
    .query(`
      SELECT TOP 5 t.szCustomerId AS [customerId], MAX(c.szName) AS [customerName], COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM SAM_MD_TVisibilityItem ti WITH(NOLOCK)
      JOIN SAM_MD_TVisibility t WITH(NOLOCK) ON t.szDocId = ti.szDocId
      JOIN X_VW_SAM_AR_Customer c WITH(NOLOCK) ON c.szCustId = t.szCustomerId
      WHERE t.dtmVisit >= @s4 AND t.dtmVisit < @e4
        AND t.szDisplayType IN ('Regular','Reguler')
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS} ${filterSql}
      GROUP BY t.szCustomerId
      HAVING COUNT(DISTINCT ti.szImageUrl) < 3
      ORDER BY COUNT(DISTINCT ti.szImageUrl) ASC
      OPTION (MAXDOP 4)
    `);

  const qDoubleCount = bindCustomerParams(req(db), region, channel)
    .input("s5", sql.Date, start).input("e5", sql.Date, endDt)
    .query(`
      ;WITH SP AS (
        SELECT t.szCustomerId, t.szSalesId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s5 AND t.dtmVisit < @e5
          AND t.szDisplayType IN ('Regular','Reguler')
          AND t.szSalesId IS NOT NULL AND t.szSalesId <> ''
          ${filterSql}
        GROUP BY t.szCustomerId, t.szSalesId
      ),
      DC AS (
        SELECT szCustomerId FROM SP GROUP BY szCustomerId HAVING COUNT(*) > 1
      )
      SELECT COUNT(*) AS [totalCount] FROM DC
      OPTION (MAXDOP 4)
    `);

  const qDoubleList = bindCustomerParams(req(db), region, channel)
    .input("s6", sql.Date, start).input("e6", sql.Date, endDt)
    .query(`
      ;WITH SP AS (
        SELECT t.szCustomerId, t.szSalesId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s6 AND t.dtmVisit < @e6
          AND t.szDisplayType IN ('Regular','Reguler')
          AND t.szSalesId IS NOT NULL AND t.szSalesId <> ''
          ${filterSql}
        GROUP BY t.szCustomerId, t.szSalesId
      ),
      DC AS (
        SELECT szCustomerId, COUNT(*) AS [salesmanCount]
        FROM SP GROUP BY szCustomerId HAVING COUNT(*) > 1
      )
      SELECT TOP 5 dc.szCustomerId AS [customerId], c.szName AS [customerName], dc.salesmanCount
      FROM DC dc
      JOIN X_VW_SAM_AR_Customer c WITH(NOLOCK) ON c.szCustId = dc.szCustomerId
      ORDER BY dc.salesmanCount DESC
      OPTION (MAXDOP 4)
    `);

  const [nvC, nvL, lpC, lpL, dcC, dcL] = await Promise.all([
    qNotVisitedCount, qNotVisitedList,
    qLowPhotoCount, qLowPhotoList,
    qDoubleCount, qDoubleList,
  ]);

  const data = [
    { list: nvL.recordset, count: nvC.recordset[0]?.totalCount || 0 },
    { list: lpL.recordset, count: lpC.recordset[0]?.totalCount || 0 },
    { list: dcL.recordset, count: dcC.recordset[0]?.totalCount || 0 },
  ];

  riskCache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
};

const getAllNotVisitedOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const offset = (page - 1) * limit;
  const searchTrim = (search || "").trim();
  const searchFilter = searchTrim ? "AND (nv.szCustId LIKE @search OR nv.customerName LIKE @search)" : "";
 
  let totalOutletFilter = "";
  if (channel && channel !== "All") totalOutletFilter += " AND szCategory_1Desc = @channel";
 
  const filterRegionJoin =
    region && region !== "All"
      ? `JOIN BOS_PI_Employee e2 WITH(NOLOCK) ON e2.szEmployeeId = a.szSalesId
         JOIN VW_Region r2 WITH(NOLOCK) ON r2.szWorkplaceId = e2.szWorkplaceId`
      : "";
  const filterRegionWhere = region && region !== "All" ? " AND r2.szRegionName = @region" : "";
 
  const qBuilder2 = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start)
    .input("e", sql.Date, endDt)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  if (searchTrim) qBuilder2.input("search", sql.VarChar, `%${searchTrim}%`);

  const result = await qBuilder2.query(`
      ;WITH ActiveAssigned AS (
        SELECT DISTINCT a.szCustId, a.szName, a.szSalesId
        FROM X_VW_SAM_AR_Customer a WITH(NOLOCK)
        ${filterRegionJoin}
        WHERE ${ACTIVE_OUTLET_FILTER} ${totalOutletFilter}
          AND a.szSalesId IS NOT NULL AND a.szSalesId <> ''
          ${filterRegionWhere}
      ),
      NotVisited AS (
        SELECT a.szCustId, a.szName AS [customerName]
        FROM ActiveAssigned a
        LEFT JOIN SAM_MD_TVisibility t WITH(NOLOCK)
          ON t.szCustomerId = a.szCustId
          AND t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
        WHERE t.szDocId IS NULL
      ),
      TotalCount AS (
        SELECT COUNT(*) AS [totalRows] FROM NotVisited
        WHERE 1=1 ${searchFilter}
      )
      SELECT
        nv.szCustId AS [customerId],
        nv.customerName,
        tc.totalRows
      FROM NotVisited nv
      CROSS JOIN TotalCount tc
      WHERE 1=1 ${searchFilter}
      ORDER BY nv.customerName
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 4)
    `);
 
  const totalRows = result.recordset[0]?.totalRows || 0;
  return {
    data: result.recordset.map(({ totalRows: _, ...row }) => row),
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getAllLowPhotoOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);
  const offset = (page - 1) * limit;
  const searchTrim = (search || "").trim();
  const searchFilter = searchTrim ? "AND (lp.customerId LIKE @search OR lp.customerName LIKE @search)" : "";
 
  const qBuilder3 = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start)
    .input("e", sql.Date, endDt)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  if (searchTrim) qBuilder3.input("search", sql.VarChar, `%${searchTrim}%`);

  const result = await qBuilder3.query(`
      ;WITH LowPhoto AS (
        SELECT
          t.szCustomerId AS [customerId],
          MAX(c.szName)  AS [customerName],
          COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId = t.szDocId
        JOIN X_VW_SAM_AR_Customer   c  WITH(NOLOCK) ON c.szCustId = t.szCustomerId
        WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
          AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
          AND ${NPN_EXISTS} ${filterSql}
        GROUP BY t.szCustomerId
        HAVING COUNT(DISTINCT ti.szImageUrl) < 3
      ),
      TotalCount AS (
        SELECT COUNT(*) AS [totalRows] FROM LowPhoto
        WHERE 1=1 ${searchFilter}
      )
      SELECT
        lp.customerId, lp.customerName, lp.totalPhotos,
        tc.totalRows
      FROM LowPhoto lp
      CROSS JOIN TotalCount tc
      WHERE 1=1 ${searchFilter}
      ORDER BY lp.totalPhotos ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 4)
    `);
 
  const totalRows = result.recordset[0]?.totalRows || 0;
  return {
    data: result.recordset.map(({ totalRows: _, ...row }) => row),
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getAllDoubleOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const filterSql = getCustomerFilter(region, channel);
  const offset = (page - 1) * limit;
  const searchTrim = (search || "").trim();
  const searchFilter = searchTrim ? "AND (dc.szCustomerId LIKE @search OR c.szName LIKE @search)" : "";
 
  const qBuilder4 = bindCustomerParams(req(db), region, channel)
    .input("s", sql.Date, start)
    .input("e", sql.Date, endDt)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  if (searchTrim) qBuilder4.input("search", sql.VarChar, `%${searchTrim}%`);

  const result = await qBuilder4.query(`
      ;WITH SP AS (
        SELECT t.szCustomerId, t.szSalesId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
          AND t.szDisplayType IN ('Regular','Reguler')
          AND t.szSalesId IS NOT NULL AND t.szSalesId <> ''
          ${filterSql}
        GROUP BY t.szCustomerId, t.szSalesId
      ),
      DoubleSales AS (
        SELECT szCustomerId, COUNT(*) AS [salesmanCount]
        FROM SP
        GROUP BY szCustomerId
        HAVING COUNT(*) > 1
      ),
      TotalCount AS (
        SELECT COUNT(*) AS [totalRows]
        FROM DoubleSales dc
        JOIN X_VW_SAM_AR_Customer c WITH(NOLOCK) ON c.szCustId = dc.szCustomerId
        WHERE 1=1 ${searchFilter}
      )
      SELECT
        dc.szCustomerId AS [customerId],
        c.szName        AS [customerName],
        dc.salesmanCount,
        tc.totalRows
      FROM DoubleSales dc
      JOIN X_VW_SAM_AR_Customer c WITH(NOLOCK) ON c.szCustId = dc.szCustomerId
      CROSS JOIN TotalCount tc
      WHERE 1=1 ${searchFilter}
      ORDER BY dc.salesmanCount DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      OPTION (MAXDOP 4)
    `);
 
  const totalRows = result.recordset[0]?.totalRows || 0;
  return {
    data: result.recordset.map(({ totalRows: _, ...row }) => row),
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getDailyTrend = async (start, end, prevStart, prevEnd, region, channel) => {
  const db = await getPool();
  const endDt = endPlusOne(end);
  const prevEndDt = endPlusOne(prevEnd);
  const filterSql = getCustomerFilter(region, channel);

  const result = await bindCustomerParams(req(db), region, channel)
    .input("s",  sql.Date, start).input("e",  sql.Date, endDt)
    .input("ps", sql.Date, prevStart).input("pe", sql.Date, prevEndDt)
    .query(`
      SELECT
        'current'                     AS [period],
        CAST(t.dtmVisit AS DATE)      AS [tgl],
        COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = t.szDocId
      WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
        AND t.szDisplayType IN ('Regular','Reguler')
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        ${filterSql}
      GROUP BY CAST(t.dtmVisit AS DATE)

      UNION ALL

      SELECT
        'prev'                        AS [period],
        CAST(t.dtmVisit AS DATE)      AS [tgl],
        COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = t.szDocId
      WHERE t.dtmVisit >= @ps AND t.dtmVisit < @pe
        AND t.szDisplayType IN ('Regular','Reguler')
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        ${filterSql}
      GROUP BY CAST(t.dtmVisit AS DATE)

      ORDER BY [period], [tgl]
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const rows = result.recordset;
  return [
    { recordset: rows.filter((r) => r.period === "current").map(({ tgl, totalPhotos }) => ({ tgl, totalPhotos })) },
    { recordset: rows.filter((r) => r.period === "prev").map(({ tgl, totalPhotos }) => ({ tgl, totalPhotos })) },
  ];
};


const getDailyData = async (start, end, endDt, region, channel) => {
  const db = await getPool();
  const filterSql = getCustomerFilter(region, channel);

  let displayFilter = "";
  if (region && region !== "All") displayFilter += " AND Region = @region";
  if (channel && channel !== "All") displayFilter += " AND CC1 = @channel";

  const qPhotos = bindCustomerParams(req(db), region, channel)
    .input("s1", sql.Date, start).input("e1", sql.Date, endDt)
    .query(`
      SELECT CAST(t.dtmVisit AS DATE) AS [tgl], COUNT(DISTINCT ti.szImageUrl) AS [totalPhotos]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = t.szDocId
      WHERE t.dtmVisit >= @s1 AND t.dtmVisit < @e1
        AND t.szDisplayType IN ('Regular','Reguler')
        AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        ${filterSql}
      GROUP BY CAST(t.dtmVisit AS DATE)
      ORDER BY CAST(t.dtmVisit AS DATE)
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qStores = bindCustomerParams(req(db), region, channel)
    .input("s2", sql.Date, start).input("e2", sql.Date, endDt)
    .query(`
      SELECT CAST(t.dtmVisit AS DATE) AS [tgl], COUNT(DISTINCT t.szCustomerId) AS [totalStores]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      WHERE t.dtmVisit >= @s2 AND t.dtmVisit < @e2
        AND t.szDisplayType IN ('Regular','Reguler')
        ${filterSql}
      GROUP BY CAST(t.dtmVisit AS DATE)
      ORDER BY CAST(t.dtmVisit AS DATE)
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qChannel = bindCustomerParams(req(db), region, channel)
    .input("s3", sql.Date, start).input("e3", sql.Date, endDt)
    .query(`
      SELECT CAST(t.dtmVisit AS DATE) AS [tgl], x.szCategory_1Desc AS [channel], COUNT(DISTINCT t.szCustomerId) AS [totalStores]
      FROM SAM_MD_TVisibility t WITH(NOLOCK)
      JOIN X_VW_SAM_AR_Customer x WITH(NOLOCK) ON x.szCustId = t.szCustomerId
      WHERE t.dtmVisit >= @s3 AND t.dtmVisit < @e3
        AND t.szDisplayType IN ('Regular','Reguler')
        ${filterSql}
      GROUP BY CAST(t.dtmVisit AS DATE), x.szCategory_1Desc
      ORDER BY CAST(t.dtmVisit AS DATE)
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qDisplay = bindCustomerParams(req(db), region, channel)
    .input("s4", sql.Date, start).input("e4", sql.Date, end)
    .query(`
      SELECT CAST([Tanggal Kunjungan] AS DATE) AS [tgl], POI,
        COUNT(DISTINCT [Link Foto])   AS [totalPhotos],
        COUNT(DISTINCT [ID Customer]) AS [totalStores]
      FROM AVO_SAM_Report_DisplayCompliance
      WHERE [Tanggal Kunjungan] BETWEEN @s4 AND @e4
        AND [Actual Facing] > 0
        AND POI IS NOT NULL AND POI <> ''
        ${displayFilter}
      GROUP BY CAST([Tanggal Kunjungan] AS DATE), POI
      ORDER BY CAST([Tanggal Kunjungan] AS DATE)
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  const qTeam = bindCustomerParams(req(db), region, channel)
    .input("s5", sql.Date, start).input("e5", sql.Date, endDt)
    .query(`
      ;WITH VisitBase AS (
        SELECT t.szDocId, t.szSalesId, t.szCustomerId
        FROM SAM_MD_TVisibility t WITH(NOLOCK)
        WHERE t.dtmVisit >= @s5 AND t.dtmVisit < @e5
          AND t.szDisplayType IN ('Regular','Reguler')
          ${filterSql}
      )
      SELECT
        CAST(t2.dtmVisit AS DATE)       AS [tgl],
        d.szName                        AS [team],
        COUNT(DISTINCT vb.szCustomerId) AS [totalStores],
        COUNT(DISTINCT ti.szImageUrl)   AS [totalPhotos]
      FROM VisitBase vb
      JOIN SAM_MD_TVisibility     t2 WITH(NOLOCK) ON t2.szDocId          = vb.szDocId
      JOIN SAM_MD_TVisibilityItem ti WITH(NOLOCK) ON ti.szDocId          = vb.szDocId
      JOIN BOS_PI_Employee        e  WITH(NOLOCK) ON e.szEmployeeId      = vb.szSalesId
      JOIN BOS_PI_Department      d  WITH(NOLOCK) ON d.szDepartmentId    = e.szDepartmentId
      WHERE ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
        AND ${NPN_EXISTS}
        AND (d.szName LIKE '%Bima%' OR d.szName LIKE '%Arjuna%' OR d.szName LIKE '%Yudistira%')
      GROUP BY CAST(t2.dtmVisit AS DATE), d.szName
      ORDER BY CAST(t2.dtmVisit AS DATE)
      OPTION (MAXDOP 8, RECOMPILE)
    `);

  return Promise.all([qPhotos, qStores, qChannel, qDisplay, qTeam]);
};


const getFilters = async () => {
  const db = await getPool();
  return Promise.all([
    db.request().query(`SELECT DISTINCT CC1 AS [channel] FROM AVO_SAM_Report_DisplayCompliance WITH(NOLOCK) WHERE CC1 IS NOT NULL AND CC1 <> '' ORDER BY CC1 OPTION (MAXDOP 4, RECOMPILE)`),
    db.request().query(`SELECT DISTINCT szRegionName AS [region] FROM VW_Region WITH(NOLOCK) WHERE szRegionName IS NOT NULL AND szRegionName <> '' ORDER BY szRegionName OPTION (MAXDOP 4, RECOMPILE)`),
  ]);
};

module.exports = {
  getDailyData,
  getOverviewStats,
  getTotalDistinctPhotos,
  getPhotoByChannel,
  getPhotoByTeam,
  getPhotoByBrand,
  getSalesmanRanking,
  getOutletRisk,
  getDailyTrend,
  getFilters,
  getAllSalesmanRanking,
  getAllDoubleOutlets,
  getAllLowPhotoOutlets,
  getAllNotVisitedOutlets,
};