const chillerRepository = require("../repositories/chiller.repository");

function endPlusOne(end) {
  const d = new Date(end);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const getDailyStats = async (start, end) => {
  const endDt = endPlusOne(end);
  
  const [r1, r2, r3, r4, r5] = await chillerRepository.getDailyData(start, end, endDt);

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

  return { photosPerDay, storesPerDay, channelPerDay, displayPerDay, teamPerDay };
};

module.exports = {
  getDailyStats
};
