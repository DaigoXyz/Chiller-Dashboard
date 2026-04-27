const { getClient, INDEX, markMonthSynced } = require("../config/elasticsearch");
const { VISITS_MAPPING, CUSTOMERS_MAPPING } = require("../config/es-mappings");
const { getPool } = require("../config/db");
const sql = require("mssql");

const BATCH_SIZE = 10000;

function fmtDate(d) {
  if (!d) return null;
  return (d instanceof Date ? d : new Date(d)).toISOString().split("T")[0];
}

function endPlusOne(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

async function ensureIndex(es, indexName, mapping) {
  const exists = await es.indices.exists({ index: indexName });
  if (!exists) {
    await es.indices.create({ index: indexName, body: mapping });
    console.log(`📦 Created index: ${indexName}`);
  }
}

async function syncVisits(startDate, endDate, options = {}) {
  const es = getClient();
  const db = await getPool();
  const endDt = endPlusOne(endDate);
  const { fullRebuild = false } = options;

  console.log(`🔄 Syncing visits: ${startDate} → ${endDate} (fullRebuild=${fullRebuild})`);
  const t0 = Date.now();

  await ensureIndex(es, INDEX.VISITS, VISITS_MAPPING);

  const syncBatchId = Date.now().toString();

  if (fullRebuild) {
    console.log(`🧹 Mark-and-sweep sync started for ${startDate} → ${endDate} (batch: ${syncBatchId})`);
    // We no longer delete documents at the start to ensure zero-downtime!
  }

  const request = db.request().input("s", sql.Date, startDate).input("e", sql.Date, endDt);
  request.stream = true;
  request.timeout = 0;

  request.query(`
    SELECT
      ti.szDocId + '|' + ti.szImageUrl AS [_id],
      t.szDocId AS [docId],
      CONVERT(varchar, t.dtmVisit, 23) AS [visitDate],
      t.szDisplayType AS [displayType],
      t.szCustomerId AS [customerId],
      c.szName AS [customerName],
      c.szStatus AS [customerStatus],
      c.szActivityStatus AS [customerActivityStatus],
      c.szCategory_1Desc AS [channel],
      r.szRegionName AS [region],
      c.szSalesId AS [assignedSalesId],
      t.szSalesId AS [salesId],
      e.szName AS [salesName],
      e.szDepartmentId AS [departmentId],
      d.szName AS [departmentName],
      ti.szImageUrl AS [imageUrl],
      ti.szProductId AS [productId],
      n.szCat1Description AS [brandName],
      CASE WHEN n.BOSnetszProductId IS NOT NULL THEN 1 ELSE 0 END AS [isValidNPN]
    FROM SAM_MD_TVisibilityItem ti WITH(NOLOCK)
    JOIN SAM_MD_TVisibility t WITH(NOLOCK) ON t.szDocId = ti.szDocId
    LEFT JOIN X_VW_SAM_AR_Customer c WITH(NOLOCK) ON c.szCustId = t.szCustomerId
    LEFT JOIN BOS_PI_Employee e WITH(NOLOCK) ON e.szEmployeeId = t.szSalesId
    LEFT JOIN VW_Region r WITH(NOLOCK) ON r.szWorkplaceId = e.szWorkplaceId
    LEFT JOIN BOS_PI_Department d WITH(NOLOCK) ON d.szDepartmentId = e.szDepartmentId
    LEFT JOIN BOS_NPN n WITH(NOLOCK) ON n.BOSnetszProductId = ti.szProductId
    WHERE t.dtmVisit >= @s AND t.dtmVisit < @e
      AND t.szDisplayType IN ('Regular','Reguler')
      AND ti.szImageUrl IS NOT NULL AND ti.szImageUrl <> ''
    OPTION (MAXDOP 8)
  `);

  let batch = [];
  let indexed = 0;

  const flushBatch = async (rows) => {
    if (rows.length === 0) return;
    const body = rows.flatMap(row => [
      { index: { _index: INDEX.VISITS, _id: row._id } },
      {
        docId: row.docId,
        visitDate: row.visitDate,
        displayType: row.displayType,
        customerId: row.customerId,
        customerName: row.customerName || "",
        customerStatus: row.customerStatus || "",
        customerActivityStatus: row.customerActivityStatus || "",
        channel: row.channel || "",
        region: row.region || "",
        assignedSalesId: row.assignedSalesId || "",
        salesId: row.salesId,
        salesName: row.salesName || "",
        departmentId: row.departmentId || "",
        departmentName: row.departmentName || "",
        imageUrl: row.imageUrl,
        productId: row.productId,
        brandName: row.brandName || "",
        isValidNPN: row.isValidNPN === 1,
        syncedAt: new Date().toISOString(),
        syncBatchId: syncBatchId, // Tag document with current batch ID
      },
    ]);
    const bulkResp = await es.bulk({ body, refresh: false });
    if (bulkResp.errors) {
      const errs = bulkResp.items.filter(it => it.index?.error);
      if (errs.length) console.error(`⚠️  ${errs.length} bulk errors. First:`, JSON.stringify(errs[0].index.error));
    }
  };

  return new Promise((resolve, reject) => {
    request.on("row", async (row) => {
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        request.pause();
        const cur = batch;
        batch = [];
        try {
          await flushBatch(cur);
          indexed += cur.length;
          if (indexed % 50000 === 0) console.log(`   Indexed ${indexed} ...`);
          request.resume();
        } catch (err) { reject(err); }
      }
    });

    request.on("error", reject);

    request.on("done", async () => {
      try {
        if (batch.length > 0) { await flushBatch(batch); indexed += batch.length; }
        
        // Sweep deleted docs (if fullRebuild, remove docs from this month without current syncBatchId)
        if (fullRebuild) {
          const deleteResp = await es.deleteByQuery({
            index: INDEX.VISITS,
            body: {
              query: {
                bool: {
                  must: [{ range: { visitDate: { gte: startDate, lt: endDt } } }],
                  must_not: [{ term: { syncBatchId: syncBatchId } }]
                }
              }
            },
            refresh: true,
            conflicts: "proceed",
          });
          console.log(`🧹 Sweep complete: Removed ${deleteResp.deleted} obsolete records from ES.`);
        } else {
          await es.indices.refresh({ index: INDEX.VISITS });
        }
        
        markMonthSynced(startDate);
        const dur = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`✅ Sync complete: ${indexed} docs in ${dur}s`);
        resolve({ synced: indexed, duration: dur });
      } catch (err) { reject(err); }
    });
  });
}

async function syncCustomers() {
  const es = getClient();
  const db = await getPool();

  console.log("🔄 Syncing customer master...");
  const t0 = Date.now();

  await ensureIndex(es, INDEX.CUSTOMERS, CUSTOMERS_MAPPING);

  const result = await db.request().query(`
    SELECT c.szCustId AS [custId], c.szName AS [name], c.szStatus AS [status],
           c.szActivityStatus AS [activityStatus], c.szCategory_1Desc AS [channel],
           r.szRegionName AS [region], c.szSalesId AS [salesId]
    FROM X_VW_SAM_AR_Customer c WITH(NOLOCK)
    LEFT JOIN BOS_PI_Employee e WITH(NOLOCK) ON e.szEmployeeId = c.szSalesId
    LEFT JOIN VW_Region r WITH(NOLOCK) ON r.szWorkplaceId = e.szWorkplaceId
    WHERE c.szActivityStatus IN ('ACT', 'NEW') AND c.szStatus IN ('ACT', 'FDE')
  `);

  const rows = result.recordset;
  console.log(`📊 ${rows.length} active customers`);

  const exists = await es.indices.exists({ index: INDEX.CUSTOMERS });
  if (exists) await es.indices.delete({ index: INDEX.CUSTOMERS });
  await es.indices.create({ index: INDEX.CUSTOMERS, body: CUSTOMERS_MAPPING });

  let indexed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const body = batch.flatMap(row => [
      { index: { _index: INDEX.CUSTOMERS, _id: row.custId } },
      { custId: row.custId, name: row.name || "", status: row.status || "", activityStatus: row.activityStatus || "", channel: row.channel || "", region: row.region || "", salesId: row.salesId || "" },
    ]);
    await es.bulk({ body, refresh: false });
    indexed += batch.length;
  }

  await es.indices.refresh({ index: INDEX.CUSTOMERS });
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Customer sync: ${indexed} docs in ${dur}s`);
  return { synced: indexed, duration: dur };
}

async function fullSync(startDate, endDate) {
  const visitResult = await syncVisits(startDate, endDate, { fullRebuild: true });
  const custResult = await syncCustomers();
  return { visits: visitResult, customers: custResult };
}

async function getSyncStatus() {
  const es = getClient();
  try {
    const [visitsCount, customersCount, health] = await Promise.all([
      es.count({ index: INDEX.VISITS }).catch(() => ({ count: 0 })),
      es.count({ index: INDEX.CUSTOMERS }).catch(() => ({ count: 0 })),
      es.cluster.health({ timeout: "3s" }),
    ]);
    return {
      healthy: health.status === "green" || health.status === "yellow",
      clusterStatus: health.status,
      indexes: { visits: { docCount: visitsCount.count }, customers: { docCount: customersCount.count } },
    };
  } catch (err) { return { healthy: false, error: err.message }; }
}

module.exports = { syncVisits, syncCustomers, fullSync, getSyncStatus, ensureIndex };
