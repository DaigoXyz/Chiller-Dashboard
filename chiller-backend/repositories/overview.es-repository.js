const { getClient, INDEX } = require("../config/elasticsearch");

async function withIndexFallback(fn, fallback = {}) {
  try {
    return await fn();
  } catch (err) {
    if (err?.meta?.statusCode === 404) return fallback;
    throw err;
  }
}

function endPlusOne(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function baseFilter(start, endDt, region, channel) {
  const filters = [
    { range: { visitDate: { gte: start, lt: endDt } } },
  ];
  if (region && region !== "All") filters.push({ term: { region } });
  if (channel && channel !== "All") filters.push({ term: { channel } });
  return filters;
}

// Filter foto konsisten: imageUrl starts with https, tanpa Regular/NPN
function photoFilter(start, endDt, region, channel) {
  return [...baseFilter(start, endDt, region, channel), { wildcard: { imageUrl: "https*" } }];
}

// Filter brand: perlu isValidNPN agar bisa group by brandName
function brandFilter(start, endDt, region, channel) {
  return [
    ...baseFilter(start, endDt, region, channel),
    { wildcard: { imageUrl: "https*" } },
    { term: { isValidNPN: true } },
    { exists: { field: "brandName" } },
  ];
}

async function search(body) {
  const es = getClient();
  return es.search({ index: INDEX.VISITS, body, size: 0 });
}

const getOverviewStats = async (start, end, prevStart, prevEnd, region, channel) => {
  const endDt = endPlusOne(end);
  const es = getClient();

  const dateRangeFilters = baseFilter(start, endDt, region, channel);

  // Total Foto: cardinality imageUrl starts with https
  const fotoResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
      aggs: {
        current: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
      },
    },
  });

  // Total Toko (visitedCurrent + totalOutlet): both from visits index with consistent filters
  const coverResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
      aggs: {
        visitedCurrent: { cardinality: { field: "customerId", precision_threshold: 5000 } },
        totalOutlet: { cardinality: { field: "customerId", precision_threshold: 5000 } },
      },
    },
  });

  const salesResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: { bool: { filter: dateRangeFilters } },
      aggs: {
        activeCurrent: { cardinality: { field: "salesId", precision_threshold: 5000 } },
      },
    },
  });

  // Total salesman: cardinality from visits with date range + filters
  const totalSalesResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: { bool: { filter: dateRangeFilters } },
      aggs: {
        total: { cardinality: { field: "salesId", precision_threshold: 5000 } },
      },
    },
  });

  return [
    {
      recordset: [{
        current: fotoResp.aggregations.current.value,
      }],
    },
    {
      recordset: [{
        visitedCurrent: coverResp.aggregations.visitedCurrent.value,
        totalOutlet: coverResp.aggregations.totalOutlet.value,
      }],
    },
    {
      recordset: [{
        activeCurrent: salesResp.aggregations.activeCurrent.value,
        totalSalesman: totalSalesResp.aggregations.total.value,
      }],
    },
  ];
};

const getTotalDistinctPhotos = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);
  const resp = await search({
    query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
    aggs: {
      total: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
    },
  });
  return resp.aggregations.total.value;
};

const getPhotoByChannel = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);

  const resp = await search({
    query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
    aggs: {
      channels: {
        // displayCategory = szDisplayCategory = POC category (RAK UMUM, COC, etc.)
        terms: { field: "displayCategory", size: 20, order: { photo_count: "desc" } },
        aggs: {
          photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
          store_count: { cardinality: { field: "customerId", precision_threshold: 5000 } },
        },
      },
    },
  });

  return {
    recordset: resp.aggregations.channels.buckets.map((b) => ({
      channel: b.key || "Lainnya",
      totalPhotos: b.photo_count.value,
      totalStores: b.store_count.value,
    })),
  };
};

const getPhotoByTeam = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);

  const resp = await search({
    query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
    aggs: {
      teams: {
        terms: { field: "departmentName", size: 20, order: { photo_count: "desc" } },
        aggs: {
          photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
          store_count: { cardinality: { field: "customerId", precision_threshold: 5000 } },
        },
      },
    },
  });

  return {
    recordset: resp.aggregations.teams.buckets.map((b) => ({
      team: b.key,
      totalPhotos: b.photo_count.value,
      totalStores: b.store_count.value,
    })),
  };
};

const getPhotoByBrand = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);
  const resp = await search({
    query: {
      bool: {
        filter: brandFilter(start, endDt, region, channel),
        must_not: [{ term: { brandName: "" } }],
      },
    },
    aggs: {
      brands: {
        terms: { field: "brandName", size: 1000, order: { photo_count: "desc" } },
        aggs: {
          photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
        },
      },
    },
  });

  // Group by bagian sebelum '|' pertama, sum photo_count
  const grouped = {};
  for (const b of resp.aggregations.brands.buckets) {
    const key = b.key.split("|")[0].trim();
    if (!key) continue;
    grouped[key] = (grouped[key] || 0) + b.photo_count.value;
  }

  return {
    recordset: Object.entries(grouped)
      .map(([brand, totalPhotos]) => ({ brand, totalPhotos }))
      .sort((a, b) => b.totalPhotos - a.totalPhotos),
  };
};

const getSalesmanRanking = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);
  const es = getClient();

  const [resp, custResp] = await Promise.all([
    es.search({
      index: INDEX.VISITS,
      body: {
        size: 0,
        query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
        aggs: {
          salesmen: {
            terms: { field: "salesId", size: 10000 },
            aggs: {
              salesName: { terms: { field: "salesName.keyword", size: 1 } },
              department: { terms: { field: "departmentName", size: 1 } },
              photo_count: {
                filter: { term: { isValidNPN: true } },
                aggs: {
                  count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
                },
              },
              visited_outlets: { cardinality: { field: "customerId", precision_threshold: 5000 } },
            },
          },
        },
      },
    }),
    // Get assigned outlets per salesman from customers index
    (() => {
      const custQuery = { bool: { filter: [] } };
      if (region && region !== "All") custQuery.bool.filter.push({ term: { region } });
      if (channel && channel !== "All") custQuery.bool.filter.push({ term: { channel } });
      return withIndexFallback(
        () => es.search({
          index: INDEX.CUSTOMERS,
          body: {
            size: 0,
            query: custQuery,
            aggs: {
              salesmen: {
                terms: { field: "salesId", size: 10000 },
                aggs: {
                  assigned: { value_count: { field: "custId" } },
                },
              },
            },
          },
        }),
        { aggregations: { salesmen: { buckets: [] } } }
      );
    })(),
  ]);

  const assignedMap = {};
  for (const b of custResp.aggregations.salesmen.buckets) {
    assignedMap[b.key] = b.assigned.value;
  }

  const allSalesmen = resp.aggregations.salesmen.buckets.map((b) => {
    const visited = b.visited_outlets.value;
    const assigned = assignedMap[b.key] || visited;
    const coverage = assigned > 0
      ? Math.min(100, Math.round((visited / assigned) * 1000) / 10)
      : 100;
    return {
      salesman: b.salesName.buckets[0]?.key || b.key,
      team: b.department.buckets[0]?.key || "Unknown",
      totalPhotos: b.photo_count.count.value,
      visitedOutlets: visited,
      totalAssignedOutlets: assigned,
      outletCoverage: coverage,
    };
  });

  allSalesmen.sort((a, b) => b.totalPhotos - a.totalPhotos);
  const top5 = allSalesmen.slice(0, 5);
  const bottom5 = allSalesmen
    .filter((s) => s.totalPhotos > 0)
    .sort((a, b) => a.totalPhotos - b.totalPhotos)
    .slice(0, 5);

  return { top5, bottom5 };
};

const getAllSalesmanRanking = async (start, end, region, channel, sortBy = "top", page = 1, limit = 20, search = "") => {
  const endDt = endPlusOne(end);
  const es = getClient();
 
  const [resp, custResp] = await Promise.all([
    es.search({
      index: INDEX.VISITS,
      body: {
        size: 0,
        query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
        aggs: {
          salesmen: {
            terms: { field: "salesId", size: 10000 },
            aggs: {
              salesName:      { terms: { field: "salesName.keyword", size: 1 } },
              department:     { terms: { field: "departmentName", size: 1 } },
              photo_count: {
                filter: { term: { isValidNPN: true } },
                aggs: {
                  count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
                },
              },
              visited_outlets: { cardinality: { field: "customerId", precision_threshold: 5000 } },
            },
          },
        },
      },
    }),
    (() => {
      const custQuery = { bool: { filter: [] } };
      if (region && region !== "All") custQuery.bool.filter.push({ term: { region } });
      if (channel && channel !== "All") custQuery.bool.filter.push({ term: { channel } });
      return withIndexFallback(
        () => es.search({
          index: INDEX.CUSTOMERS,
          body: {
            size: 0,
            query: custQuery,
            aggs: {
              salesmen: {
                terms: { field: "salesId", size: 10000 },
                aggs: { assigned: { value_count: { field: "custId" } } },
              },
            },
          },
        }),
        { aggregations: { salesmen: { buckets: [] } } }
      );
    })(),
  ]);
 
  const assignedMap = {};
  for (const b of custResp.aggregations.salesmen.buckets) {
    assignedMap[b.key] = b.assigned.value;
  }
 
  let allSalesmen = resp.aggregations.salesmen.buckets.map((b) => {
    const visited  = b.visited_outlets.value;
    const assigned = assignedMap[b.key] || visited;
    const coverage =
      assigned > 0 ? Math.min(100, Math.round((visited / assigned) * 1000) / 10) : 100;
 
    return {
      salesman:            b.salesName.buckets[0]?.key || b.key,
      team:                b.department.buckets[0]?.key || "Unknown",
      totalPhotos:         b.photo_count.count.value,
      visitedOutlets:      visited,
      totalAssignedOutlets: assigned,
      outletCoverage:      coverage,
    };
  });
 
  // Urutkan sesuai sortBy
  if (sortBy === "bottom") {
    allSalesmen = allSalesmen
      .filter((s) => s.totalPhotos > 0)
      .sort((a, b) => a.totalPhotos - b.totalPhotos);
  } else {
    allSalesmen.sort((a, b) => b.totalPhotos - a.totalPhotos);
  }

  // Filter by search
  const searchTrim = (search || "").trim().toLowerCase();
  if (searchTrim) {
    allSalesmen = allSalesmen.filter(
      (s) =>
        s.salesman.toLowerCase().includes(searchTrim) ||
        s.team.toLowerCase().includes(searchTrim)
    );
  }
 
  const totalRows  = allSalesmen.length;
  const offset     = (page - 1) * limit;
  const data       = allSalesmen.slice(offset, offset + limit);
 
  return {
    data,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getOutletRisk = async (start, end, weekStart, weekEnd, region, channel) => {
  const endDt = endPlusOne(end);
  const es = getClient();

  const custFilter = { bool: { filter: [{ exists: { field: "salesId" } }], must_not: [{ term: { salesId: "" } }] } };
  if (region && region !== "All") custFilter.bool.filter.push({ term: { region } });
  if (channel && channel !== "All") custFilter.bool.filter.push({ term: { channel } });

  const [visitedResp, totalCustResp] = await Promise.all([
    search({
      query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
      aggs: { visited: { cardinality: { field: "customerId", precision_threshold: 10000 } } },
    }),
    withIndexFallback(
      () => es.count({ index: INDEX.CUSTOMERS, body: { query: custFilter } }),
      { count: 0 }
    ),
  ]);

  const visitedCount = visitedResp.aggregations.visited.value;
  const totalCust = totalCustResp.count;
  const notVisitedCount = Math.max(0, totalCust - visitedCount);

  const [lowPhotoResp, doubleResp] = await Promise.all([
    search({
      query: { bool: { filter: npnFilter(start, endDt, region, channel) } },
      aggs: {
        outlets: {
          terms: { field: "customerId", size: 500, order: { photos: "asc" } },
          aggs: {
            photos: { cardinality: { field: "imageUrl", precision_threshold: 100 } },
            name: { terms: { field: "customerName.keyword", size: 1 } },
            low: { bucket_selector: { buckets_path: { c: "photos" }, script: "params.c < 3" } },
          },
        },
        low_count: {
          filter: { bool: { filter: [] } },
          aggs: {
            outlets: {
              terms: { field: "customerId", size: 65535 },
              aggs: {
                photos: { cardinality: { field: "imageUrl", precision_threshold: 100 } },
                low: { bucket_selector: { buckets_path: { c: "photos" }, script: "params.c < 3" } },
              },
            },
          },
        },
      },
    }),
    search({
      query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
      aggs: {
        outlets: {
          terms: { field: "customerId", size: 500, order: { sales: "desc" } },
          aggs: {
            sales: { cardinality: { field: "salesId", precision_threshold: 100 } },
            name: { terms: { field: "customerName.keyword", size: 1 } },
            multi: { bucket_selector: { buckets_path: { c: "sales" }, script: "params.c > 1" } },
          },
        },
        double_count: {
          filter: { bool: { filter: [] } },
          aggs: {
            outlets: {
              terms: { field: "customerId", size: 65535 },
              aggs: {
                sales: { cardinality: { field: "salesId", precision_threshold: 100 } },
                multi: { bucket_selector: { buckets_path: { c: "sales" }, script: "params.c > 1" } },
              },
            },
          },
        },
      },
    }),
  ]);

  const lowList = lowPhotoResp.aggregations.outlets.buckets.slice(0, 5).map(b => ({
    customerId: b.key, customerName: b.name.buckets[0]?.key || "", totalPhotos: b.photos.value,
  }));
  const lowCount = lowPhotoResp.aggregations.low_count.outlets.buckets.length;

  const doubleList = doubleResp.aggregations.outlets.buckets.slice(0, 5).map(b => ({
    customerId: b.key, customerName: b.name.buckets[0]?.key || "", salesmanCount: b.sales.value,
  }));
  const doubleCount = doubleResp.aggregations.double_count.outlets.buckets.length;

  // Get not-visited list (top 5 names) from customers index
  const nvResp = await withIndexFallback(
    () => es.search({
      index: INDEX.CUSTOMERS,
      body: { size: 5, query: custFilter, _source: ["custId", "name"] },
    }),
    { hits: { hits: [] } }
  );
  const notVisitedList = nvResp.hits.hits.map(h => ({ customerId: h._source.custId, customerName: h._source.name }));

  return [
    { list: notVisitedList, count: notVisitedCount },
    { list: lowList, count: lowCount },
    { list: doubleList, count: doubleCount },
  ];
};

const getAllNotVisitedOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const endDt = endPlusOne(end);
  const es    = getClient();
 
  // Ambil semua customerId yang SUDAH dikunjungi
  const visitedResp = await search({
    query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
    aggs: {
      visited_ids: {
        terms: { field: "customerId", size: 65535 },
      },
    },
  });
 
  const visitedSet = new Set(
    visitedResp.aggregations.visited_ids.buckets.map((b) => b.key)
  );
 
  // Ambil semua customer aktif dari index customers
  const custFilter = {
    bool: {
      filter: [{ exists: { field: "salesId" } }],
      must_not: [{ term: { salesId: "" } }],
    },
  };
  if (region && region !== "All") custFilter.bool.filter.push({ term: { region } });
  if (channel && channel !== "All") custFilter.bool.filter.push({ term: { channel } });
 
  const custResp = await withIndexFallback(
    () => es.search({
      index: INDEX.CUSTOMERS,
      body: {
        size: 10000,
        query: custFilter,
        _source: ["custId", "name"],
        sort: [{ "name.keyword": { order: "asc" } }],
      },
    }),
    { hits: { hits: [] } }
  );
 
  let notVisited = custResp.hits.hits
    .map((h) => ({ customerId: h._source.custId, customerName: h._source.name }))
    .filter((c) => !visitedSet.has(c.customerId));

  const searchTrimNV = (search || "").trim().toLowerCase();
  if (searchTrimNV) {
    notVisited = notVisited.filter(
      (c) =>
        c.customerId.toLowerCase().includes(searchTrimNV) ||
        c.customerName.toLowerCase().includes(searchTrimNV)
    );
  }
 
  const totalRows = notVisited.length;
  const offset    = (page - 1) * limit;
  const data      = notVisited.slice(offset, offset + limit);
 
  return {
    data,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getAllLowPhotoOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const endDt = endPlusOne(end);
 
  // Ambil semua bucket outlet dengan foto < 3 (size besar)
  const resp = await search({
    query: { bool: { filter: npnFilter(start, endDt, region, channel) } },
    aggs: {
      outlets: {
        terms: { field: "customerId", size: 65535, order: { photos: "asc" } },
        aggs: {
          photos: { cardinality: { field: "imageUrl", precision_threshold: 100 } },
          name:   { terms: { field: "customerName.keyword", size: 1 } },
          low:    { bucket_selector: { buckets_path: { c: "photos" }, script: "params.c < 3" } },
        },
      },
    },
  });
 
  let allLow = resp.aggregations.outlets.buckets.map((b) => ({
    customerId:   b.key,
    customerName: b.name.buckets[0]?.key || "",
    totalPhotos:  b.photos.value,
  }));
 
  // Sudah terurut ASC dari ES, tapi pastikan
  allLow.sort((a, b) => a.totalPhotos - b.totalPhotos);

  const searchTrimLP = (search || "").trim().toLowerCase();
  if (searchTrimLP) {
    allLow = allLow.filter(
      (c) =>
        c.customerId.toLowerCase().includes(searchTrimLP) ||
        c.customerName.toLowerCase().includes(searchTrimLP)
    );
  }
 
  const totalRows = allLow.length;
  const offset    = (page - 1) * limit;
  const data      = allLow.slice(offset, offset + limit);
 
  return {
    data,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

const getAllDoubleOutlets = async (start, end, region, channel, page = 1, limit = 20, search = "") => {
  const endDt = endPlusOne(end);
 
  const resp = await search({
    query: { bool: { filter: baseFilter(start, endDt, region, channel) } },
    aggs: {
      outlets: {
        terms: { field: "customerId", size: 65535, order: { sales: "desc" } },
        aggs: {
          sales: { cardinality: { field: "salesId", precision_threshold: 100 } },
          name:  { terms: { field: "customerName.keyword", size: 1 } },
          multi: { bucket_selector: { buckets_path: { c: "sales" }, script: "params.c > 1" } },
        },
      },
    },
  });
 
  let allDouble = resp.aggregations.outlets.buckets.map((b) => ({
    customerId:   b.key,
    customerName: b.name.buckets[0]?.key || "",
    salesmanCount: b.sales.value,
  }));
 
  // Sudah terurut DESC dari ES
  const searchTrimDC = (search || "").trim().toLowerCase();
  if (searchTrimDC) {
    allDouble = allDouble.filter(
      (c) =>
        c.customerId.toLowerCase().includes(searchTrimDC) ||
        c.customerName.toLowerCase().includes(searchTrimDC)
    );
  }
  const totalRows = allDouble.length;
  const offset    = (page - 1) * limit;
  const data      = allDouble.slice(offset, offset + limit);
 
  return {
    data,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
  };
};

// getDailyTrend — 1 ES query for daily histogram + totals for both periods
// Eliminates 2 extra getTotalDistinctPhotos round-trips from service layer
const getDailyTrend = async (start, end, prevStart, prevEnd, region, channel) => {
  const endDt = endPlusOne(end);
  const prevEndDt = endPlusOne(prevEnd);

  const sharedFilters = [
    { wildcard: { imageUrl: "https*" } },
    ...( region && region !== "All" ? [{ term: { region } }] : [] ),
    ...( channel && channel !== "All" ? [{ term: { channel } }] : [] ),
    {
      bool: {
        should: [
          { range: { visitDate: { gte: start, lt: endDt } } },
          { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
        ],
        minimum_should_match: 1,
      },
    },
  ];

  const resp = await search({
    query: { bool: { filter: sharedFilters } },
    aggs: {
      current: {
        filter: { range: { visitDate: { gte: start, lt: endDt } } },
        aggs: {
          total_photos: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
          daily: {
            date_histogram: { field: "visitDate", calendar_interval: "day" },
            aggs: {
              photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
            },
          },
        },
      },
      prev: {
        filter: { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
        aggs: {
          total_photos: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
          daily: {
            date_histogram: { field: "visitDate", calendar_interval: "day" },
            aggs: {
              photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
            },
          },
        },
      },
    },
  });

  const currentBuckets = resp.aggregations.current.daily.buckets.map((b) => ({
    tgl: b.key_as_string,
    totalPhotos: b.photo_count.value,
  }));

  const prevBuckets = resp.aggregations.prev.daily.buckets.map((b) => ({
    tgl: b.key_as_string,
    totalPhotos: b.photo_count.value,
  }));

  // Return totals inline — service no longer needs separate getTotalDistinctPhotos calls
  return [
    { recordset: currentBuckets, total: resp.aggregations.current.total_photos.value },
    { recordset: prevBuckets,    total: resp.aggregations.prev.total_photos.value },
  ];
};

const getDailyData = async (start, end, endDt, region, channel) => {
  const resp = await search({
    query: { bool: { filter: photoFilter(start, endDt, region, channel) } },
    aggs: {
      daily: {
        date_histogram: { field: "visitDate", calendar_interval: "day" },
        aggs: {
          photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
          store_count: { cardinality: { field: "customerId", precision_threshold: 5000 } },
        },
      },
    },
  });

  const photos = resp.aggregations.daily.buckets.map((b) => ({
    tgl: b.key_as_string,
    totalPhotos: b.photo_count.value,
  }));

  const stores = resp.aggregations.daily.buckets.map((b) => ({
    tgl: b.key_as_string,
    totalStores: b.store_count.value,
  }));

  // Return empty arrays for now, let SQL fallback handle them if needed
  return [
    { recordset: photos },
    { recordset: stores },
    { recordset: [] },  // channelPerDay  — complex, falls back to SQL
    { recordset: [] },  // displayPerDay  — different table entirely
    { recordset: [] },  // teamPerDay     — complex, falls back to SQL
  ];
};

const getFilters = async () => {
  const es = getClient();

  const resp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      aggs: {
        channels: { terms: { field: "channel", size: 100, order: { _key: "asc" } } },
        regions: { terms: { field: "region", size: 100, order: { _key: "asc" } } },
      },
    },
  });

  return [
    { recordset: resp.aggregations.channels.buckets.filter(b => b.key).map((b) => ({ CC1: b.key })) },
    { recordset: resp.aggregations.regions.buckets.filter(b => b.key).map((b) => ({ Region: b.key })) },
  ];
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