const sqlRepo = require("../repositories/overview.repository");
const esRepo = require("../repositories/overview.es-repository");
const { isHealthy, isMonthReady, waitForMonthIfSyncing, monthNeedsSync } = require("../config/elasticsearch");
const { syncVisits } = require("../sync/es-sync");

/**
 * Pick repo based on ES health AND whether the month is fully synced.
 * Falls back to SQL if ES is down OR month data isn't ready yet.
 */
function getRepoForMonth(monthKey) {
  if (!isHealthy()) return sqlRepo;
  if (!isMonthReady(monthKey)) {
    console.log(`  🗄️  Month ${monthKey} not ready in ES — using SQL fallback`);
    return sqlRepo;
  }
  console.log("  📡 Using Elasticsearch");
  return esRepo;
}

/**
 * Trigger a background sync if month isn't synced yet (fire-and-forget).
 * The current request always uses SQL when month isn't ready.
 * Next requests will use ES once sync completes.
 */
async function ensureEsData(start, end) {
  if (!isHealthy()) return;

  const monthKey = start.slice(0, 7);

  // Already fully synced — nothing to do
  if (isMonthReady(monthKey)) return;

  // Sync already in progress — don't launch duplicate
  if (!monthNeedsSync(monthKey)) return;

  // Trigger sync fire-and-forget
  console.log(`🔄 On-demand sync triggered for ${monthKey} (non-blocking)`);
  syncVisits(start, end, { fullRebuild: false }).catch(err =>
    console.error(`❌ On-demand sync failed for ${monthKey}: ${err.message}`)
  );
}

function fmt(d) { return d instanceof Date ? d.toISOString().split("T")[0] : String(d); }
function pctChange(cur, prev) { return (!prev || prev === 0) ? null : Math.round(((cur - prev) / prev) * 1000) / 10; }

function getPrevMonthRange(start, end) {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  const ps = new Date(s);
  ps.setUTCMonth(ps.getUTCMonth() - 1);
  const pe = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - 1, e.getUTCDate()));
  if (pe.getUTCMonth() === e.getUTCMonth()) pe.setUTCDate(0);
  return { prevStart: ps.toISOString().split("T")[0], prevEnd: pe.toISOString().split("T")[0] };
}

function getCurrentWeekRange() {
  const today = new Date();
  const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  return { weekStart: mon.toISOString().split("T")[0], weekEnd: today.toISOString().split("T")[0] };
}

// ─── 1. getOverview ───
const getOverview = async (start, end, region, channel) => {
  const { prevStart, prevEnd } = getPrevMonthRange(start, end);
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  const repo = getRepoForMonth(monthKey);

  const [r1, r2, r3] = await repo.getOverviewStats(start, end, prevStart, prevEnd, region, channel);

  const foto = r1.recordset[0] || {};
  const cover = r2.recordset[0] || {};
  const sales = r3.recordset[0] || {};

  const totalFotoCurr = foto.current || 0;
  const visitedCurr = cover.visitedCurrent || 0;
  const totalOutlet = cover.totalOutlet || 0;
  const activeCurr = sales.activeCurrent || 0;
  const totalSalesman = sales.totalSalesman || 0;

  const coveragePct = totalOutlet > 0 ? Math.round((visitedCurr / totalOutlet) * 1000) / 10 : 0;
  const activePct = totalSalesman > 0 ? Math.round((activeCurr / totalSalesman) * 1000) / 10 : 0;

  return {
    period: { start, end },
    statCards: {
      totalFoto: { value: totalFotoCurr },
      coverageOutlet: { value: coveragePct, visitedOutlets: visitedCurr, totalOutlets: totalOutlet, targetPct: 80 },
      activeSalesman: { value: activePct, activeCount: activeCurr, totalCount: totalSalesman },
      outletAktif: { value: visitedCurr, totalOutlets: totalOutlet },
    },
  };
};

// ─── 2. getPerformanceComparison ───
const getPerformanceComparison = async (start, end, region, channelParam) => {
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  const repo = getRepoForMonth(monthKey);

  const [rChannel, rTeam, rBrand, trueBrandTotal] = await Promise.all([
    repo.getPhotoByChannel(start, end, region, channelParam),
    repo.getPhotoByTeam(start, end, region, channelParam),
    repo.getPhotoByBrand(start, end, region, channelParam),
    repo.getTotalDistinctPhotos(start, end, region, channelParam),
  ]);

  const channel = rChannel.recordset.map(r => ({ channel: r.channel || "Other", totalPhotos: r.totalPhotos, totalStores: r.totalStores }));
  const team = rTeam.recordset.map(r => ({ team: r.team, totalPhotos: r.totalPhotos, totalStores: r.totalStores }));
  const brand = rBrand.recordset.map(r => ({ brand: r.brand, totalPhotos: r.totalPhotos }));

  const sumTop = brand.reduce((s, b) => s + b.totalPhotos, 0);
  let scaled = [], running = 0;
  for (let i = 0; i < brand.length; i++) {
    let v = sumTop > 0 ? Math.round(brand[i].totalPhotos * (trueBrandTotal / sumTop)) : 0;
    if (i === brand.length - 1) v = trueBrandTotal - running;
    running += v;
    scaled.push({ ...brand[i], totalPhotos: v, pct: trueBrandTotal > 0 ? Math.round((v / trueBrandTotal) * 1000) / 10 : 0 });
  }
  scaled.sort((a, b) => b.totalPhotos - a.totalPhotos);

  return { channel, team, brand: scaled, brandTotal: trueBrandTotal };
};

// ─── 3. getSalesmanRanking ───
const getSalesmanRanking = async (start, end, region, channel) => {
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  const repo = getRepoForMonth(monthKey);
  const { top5, bottom5 } = await repo.getSalesmanRanking(start, end, region, channel);
  const mapRow = row => ({
    salesman: row.salesman, team: row.team, totalPhotos: row.totalPhotos,
    visitedOutlets: row.visitedOutlets, totalAssignedOutlets: row.totalAssignedOutlets,
    outletCoverage: row.outletCoverage,
  });
  return { top5: top5.map(mapRow), bottom5: bottom5.map(mapRow) };
};

// ─── 4. getOutletRisk ───
const getOutletRisk = async (start, end, weekStart, weekEnd, region, channel) => {
  const week = weekStart && weekEnd ? { weekStart, weekEnd } : getCurrentWeekRange();
  await ensureEsData(start, end);
  // outlet risk always uses SQL (more accurate for not-visited logic)
  const [rNotVisited, rLowPhoto, rDouble] = await sqlRepo.getOutletRisk(start, end, week.weekStart, week.weekEnd, region, channel);

  return {
    weekRange: week,
    belumDikunjungi: { total: rNotVisited.count, items: rNotVisited.list.map(r => ({ customerId: r.customerId, customerName: r.customerName })) },
    fotoRendah: { total: rLowPhoto.count, threshold: 3, items: rLowPhoto.list.map(r => ({ customerId: r.customerId, customerName: r.customerName, totalPhotos: r.totalPhotos })) },
    doubleCoverage: { total: rDouble.count, items: rDouble.list.map(r => ({ customerId: r.customerId, customerName: r.customerName, salesmanCount: r.salesmanCount })) },
  };
};

// ─── 5. getDailyTrend ───
const getDailyTrend = async (start, end, region, channel) => {
  const { prevStart, prevEnd } = getPrevMonthRange(start, end);
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  await ensureEsData(prevStart, prevEnd);
  const repo = getRepoForMonth(monthKey);

  const [rCurr, rPrev] = await repo.getDailyTrend(start, end, prevStart, prevEnd, region, channel);

  // ES repo returns .total inline; SQL repo doesn't — fall back to summing recordset
  const trueCurr = rCurr.total ?? rCurr.recordset.reduce((s, r) => s + r.totalPhotos, 0);
  const truePrev = rPrev.total ?? rPrev.recordset.reduce((s, r) => s + r.totalPhotos, 0);

  // Return daily data as-is without scaling to preserve sum accuracy
  const current = rCurr.recordset.map(r => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos }));
  const prev    = rPrev.recordset.map(r => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos }));

  return {
    current, prev,
    summary: { totalCurrent: trueCurr, totalPrev: truePrev, changePct: pctChange(trueCurr, truePrev), changeDirection: trueCurr >= truePrev ? "up" : "down" },
    prevPeriod: { prevStart, prevEnd },
  };
};

// ─── 6. getDailyStats ───
const getDailyStats = async (start, end, region, channel) => {
  const endDt = new Date(end); endDt.setDate(endDt.getDate() + 1);
  const endStr = endDt.toISOString().split("T")[0];
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  const repo = getRepoForMonth(monthKey);

  const [r1, r2, r3, r4, r5] = await repo.getDailyData(start, end, endStr, region, channel);
  return {
    photosPerDay: r1.recordset.map(r => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos })),
    storesPerDay: r2.recordset.map(r => ({ tgl: fmt(r.tgl), totalStores: r.totalStores })),
    channelPerDay: r3.recordset.map(r => ({ tgl: fmt(r.tgl), channel: r.channel || "Other", totalStores: r.totalStores })),
    displayPerDay: r4.recordset.map(r => ({ tgl: fmt(r.tgl), poi: r.POI || "Other", totalPhotos: r.totalPhotos, totalStores: r.totalStores })),
    teamPerDay: r5.recordset.map(r => ({ tgl: fmt(r.tgl), team: r.team || "Unknown", totalStores: r.totalStores, totalPhotos: r.totalPhotos })),
  };
};

// ─── 7. getFilters ───
const getFilters = async () => {
  const [rChannel, rRegion] = await sqlRepo.getFilters();
  return {
    channels: rChannel.recordset.map(r => r.channel).filter(Boolean),
    regions: rRegion.recordset.map(r => r.region).filter(Boolean),
  };
};

const apiCache = new Map();
const API_CACHE_TTL = 15 * 60 * 1000;

const withCache = (fn, prefix) => async (...args) => {
  const cacheKey = `${prefix}_${args.join("_")}`;
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < API_CACHE_TTL) return cached.data;
  }
  const data = await fn(...args);
  apiCache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
};

const getAllSalesmanRanking = async (start, end, region, channel, sortBy, page, limit, search = "") => {
  const monthKey = start.slice(0, 7);
  await ensureEsData(start, end);
  const repo = getRepoForMonth(monthKey);
  return repo.getAllSalesmanRanking(start, end, region, channel, sortBy, page, limit, search);
};

const getAllNotVisitedOutlets = async (start, end, region, channel, page, limit, search = "") => {
  await ensureEsData(start, end);
  return sqlRepo.getAllNotVisitedOutlets(start, end, region, channel, page, limit, search);
};

const getAllLowPhotoOutlets = async (start, end, region, channel, page, limit, search = "") => {
  await ensureEsData(start, end);
  return sqlRepo.getAllLowPhotoOutlets(start, end, region, channel, page, limit, search);
};

const getAllDoubleOutlets = async (start, end, region, channel, page, limit, search = "") => {
  await ensureEsData(start, end);
  return sqlRepo.getAllDoubleOutlets(start, end, region, channel, page, limit, search);
};

module.exports = {
  getDailyStats: withCache(getDailyStats, "daily"),
  getOverview: withCache(getOverview, "overview"),
  getPerformanceComparison: withCache(getPerformanceComparison, "perf"),
  getSalesmanRanking: withCache(getSalesmanRanking, "ranking"),
  getOutletRisk: withCache(getOutletRisk, "risk"),
  getDailyTrend: withCache(getDailyTrend, "trend"),
  getFilters: withCache(getFilters, "filters"),
  getAllSalesmanRanking: withCache(getAllSalesmanRanking, "all_ranking"),
  getAllNotVisitedOutlets: withCache(getAllNotVisitedOutlets, "all_not_visited"),
  getAllLowPhotoOutlets: withCache(getAllLowPhotoOutlets, "all_low_photo"),
  getAllDoubleOutlets: withCache(getAllDoubleOutlets, "all_double"),
};