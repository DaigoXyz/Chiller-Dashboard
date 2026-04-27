const { sql, getPool } = require("./chiller-backend/config/db");
async function test() {
  const db = await getPool();
  const res = await db.request().query(`
    SELECT TOP 10 c.szCustId, c.szSalesId, e.szEmployeeId, e.szWorkplaceId, r.szRegionName
    FROM X_VW_SAM_AR_Customer c WITH(NOLOCK)
    LEFT JOIN BOS_PI_Employee e WITH(NOLOCK) ON e.szEmployeeId = c.szSalesId
    LEFT JOIN VW_Region r WITH(NOLOCK) ON r.szWorkplaceId = e.szWorkplaceId
    WHERE c.szSalesId IS NOT NULL AND c.szSalesId <> ''
  `);
  console.log(res.recordset);
  process.exit(0);
}
test();
