const sqlRepo = require("../repositories/overview.repository");
const esRepo = require("../repositories/overview.es-repository");
const { isHealthy, hasDataForRange } = require("../config/elasticsearch");
const { syncVisits } = require("../sync/es-sync");

// Dynamic repo: ES when healthy, SQL fallback
function getRepo() {
  const useES = isHealthy();
  if (useES) console.log("  📡 Using Elasticsearch");
  return useES ? esRepo : sqlRepo;
}

const repo = new Proxy({}, { get(_, prop) { return getRepo()[prop]; } });

// Ensure ES has data for the requested period. If not, sync on-demand from SQL.
let syncLock = Promise.resolve();
async function ensureEsData(start, end) {
  if (!isHealthy()) return;
  const has = await hasDataForRange(start, end);
  if (has) return;

  // Serialize syncs to avoid duplicate work
  const prev = syncLock;
  let release;
  syncLock = new Promise(r => (release = r));
  await prev;
  try {
    // Re-check after waiting (another request may have synced already)
    const hasNow = await hasDataForRange(start, end);
    if (!hasNow) {
      console.log(`🔄 On-demand sync for ${start} → ${end}`);
      await syncVisits(start, end, { fullRebuild: false });
    }
  } finally { release(); }
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
  await ensureEsData(start, end);
  await ensureEsData(prevStart, prevEnd);

  const [r1, r2, r3] = await repo.getOverviewStats(start, end, prevStart, prevEnd, region, channel);

  const foto = r1.recordset[0] || {};
  const cover = r2.recordset[0] || {};
  const sales = r3.recordset[0] || {};

  const totalFotoCurr = foto.current || 0;
  const totalFotoPrev = foto.prev || 0;
  const visitedCurr = cover.visitedCurrent || 0;
  const visitedPrev = cover.visitedPrev || 0;
  const totalOutlet = cover.totalOutlet || 0;
  const activeCurr = sales.activeCurrent || 0;
  const activePrev = sales.activePrev || 0;
  const totalSalesman = sales.totalSalesman || 0;

  const coveragePct = totalOutlet > 0 ? Math.round((visitedCurr / totalOutlet) * 1000) / 10 : 0;
  const avgFoto = visitedCurr > 0 ? Math.round(totalFotoCurr / visitedCurr) : 0;
  const avgFotoPrev = visitedPrev > 0 ? Math.round(totalFotoPrev / visitedPrev) : 0;
  const activePct = totalSalesman > 0 ? Math.round((activeCurr / totalSalesman) * 1000) / 10 : 0;
  const activePrevPct = totalSalesman > 0 ? Math.round((activePrev / totalSalesman) * 1000) / 10 : 0;

  return {
    period: { start, end, prevStart, prevEnd },
    statCards: {
      totalFoto: {
        value: totalFotoCurr, prevValue: totalFotoPrev,
        changePct: pctChange(totalFotoCurr, totalFotoPrev),
        changeDirection: totalFotoCurr >= totalFotoPrev ? "up" : "down",
      },
      coverageOutlet: {
        value: coveragePct, prevValue: 80,
        changePct: Math.round((coveragePct - 80) * 10) / 10,
        changeDirection: coveragePct >= 80 ? "up" : "down",
        visitedOutlets: visitedCurr, totalOutlets: totalOutlet, targetPct: 80,
      },
      avgFotoPerOutlet: {
        value: avgFoto, prevValue: avgFotoPrev,
        changePct: pctChange(avgFoto, avgFotoPrev),
        changeDirection: avgFoto >= avgFotoPrev ? "up" : "down",
      },
      activeSalesman: {
        value: activePct, prevValue: activePrevPct,
        changePct: pctChange(activePct, activePrevPct),
        changeDirection: activePct >= activePrevPct ? "up" : "down",
        activeCount: activeCurr, totalCount: totalSalesman,
      },
      outletAktif: { value: visitedCurr, totalOutlets: totalOutlet },
    },
  };
};

// ─── 2. getPerformanceComparison ───
const getPerformanceComparison = async (start, end, region, channelParam) => {
  await ensureEsData(start, end);

  const [rChannel, rTeam, rBrand, trueBrandTotal] = await Promise.all([
    repo.getPhotoByChannel(start, end, region, channelParam),
    repo.getPhotoByTeam(start, end, region, channelParam),
    repo.getPhotoByBrand(start, end, region, channelParam),
    repo.getTotalDistinctPhotos(start, end, region, channelParam),
  ]);

  const channel = rChannel.recordset.map(r => ({ channel: r.channel || "Other", totalPhotos: r.totalPhotos, totalStores: r.totalStores }));
  const team = rTeam.recordset.map(r => ({ team: r.team, totalPhotos: r.totalPhotos, totalStores: r.totalStores }));
  const brand = rBrand.recordset.map(r => ({ brand: r.brand, totalPhotos: r.totalPhotos }));

  // Scale brand totals to match exact distinct photo count
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

const getSalesmanRanking = async (start, end, region, channel) => {
  await ensureEsData(start, end);
  const { top5, bottom5 } = await repo.getSalesmanRanking(start, end, region, channel);
  const mapRow = row => ({
    salesman: row.salesman, team: row.team, totalPhotos: row.totalPhotos,
    visitedOutlets: row.visitedOutlets, totalAssignedOutlets: row.totalAssignedOutlets,
    outletCoverage: row.outletCoverage,
  });
  return { top5: top5.map(mapRow), bottom5: bottom5.map(mapRow) };
};

const getOutletRisk = async (start, end, weekStart, weekEnd, region, channel) => {
  const week = weekStart && weekEnd ? { weekStart, weekEnd } : getCurrentWeekRange();
  await ensureEsData(start, end);
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
  await ensureEsData(start, end);
  await ensureEsData(prevStart, prevEnd);

  const [rTrend, trueCurr, truePrev] = await Promise.all([
    repo.getDailyTrend(start, end, prevStart, prevEnd, region, channel),
    repo.getTotalDistinctPhotos(start, end, region, channel),
    repo.getTotalDistinctPhotos(prevStart, prevEnd, region, channel),
  ]);

  const [rCurr, rPrev] = rTrend;
  let current = rCurr.recordset.map(r => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos }));
  let prev = rPrev.recordset.map(r => ({ tgl: fmt(r.tgl), totalPhotos: r.totalPhotos }));

  // Scale daily totals to match exact distinct count
  const scaleArr = (arr, target) => {
    const sum = arr.reduce((s, r) => s + r.totalPhotos, 0);
    let run = 0;
    for (let i = 0; i < arr.length; i++) {
      let v = sum > 0 ? Math.round(arr[i].totalPhotos * (target / sum)) : 0;
      if (i === arr.length - 1) v = target - run;
      run += v;
      arr[i].totalPhotos = v;
    }
  };
  scaleArr(current, trueCurr);
  scaleArr(prev, truePrev);

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
  await ensureEsData(start, end);

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
    if (Date.now() - cached.timestamp < API_CACHE_TTL) {
      return cached.data;
    }
  }
  const data = await fn(...args);
  apiCache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
};

const getAllSalesmanRanking = async (start, end, region, channel, sortBy, page, limit, search = "") => {
  await ensureEsData(start, end);
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