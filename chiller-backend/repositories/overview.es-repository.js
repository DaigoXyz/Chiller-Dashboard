const { getClient, INDEX } = require("../config/elasticsearch");

function endPlusOne(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function baseFilter(start, endDt, region, channel) {
  const filters = [
    { range: { visitDate: { gte: start, lt: endDt } } },
    { terms: { displayType: ["Regular", "Reguler"] } },
  ];
  if (region && region !== "All") filters.push({ term: { region } });
  if (channel && channel !== "All") filters.push({ term: { channel } });
  return filters;
}

function npnFilter(start, endDt, region, channel) {
  return [...baseFilter(start, endDt, region, channel), { term: { isValidNPN: true } }];
}

async function search(body) {
  const es = getClient();
  return es.search({ index: INDEX.VISITS, body, size: 0 });
}

const getOverviewStats = async (start, end, prevStart, prevEnd, region, channel) => {
  const endDt = endPlusOne(end);
  const prevEndDt = endPlusOne(prevEnd);
  const es = getClient();

  const commonFilters = [
    { terms: { displayType: ["Regular", "Reguler"] } }
  ];
  if (region && region !== "All") commonFilters.push({ term: { region } });
  if (channel && channel !== "All") commonFilters.push({ term: { channel } });

  const fotoResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...commonFilters,
            { term: { isValidNPN: true } },
            {
              bool: {
                should: [
                  { range: { visitDate: { gte: start, lt: endDt } } },
                  { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        current: {
          filter: { range: { visitDate: { gte: start, lt: endDt } } },
          aggs: { count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } } },
        },
        prev: {
          filter: { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
          aggs: { count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } } },
        },
      },
    },
  });

  const coverResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...commonFilters,
            {
              bool: {
                should: [
                  { range: { visitDate: { gte: start, lt: endDt } } },
                  { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        visitedCurrent: {
          filter: { range: { visitDate: { gte: start, lt: endDt } } },
          aggs: { count: { cardinality: { field: "customerId", precision_threshold: 5000 } } },
        },
        visitedPrev: {
          filter: { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
          aggs: { count: { cardinality: { field: "customerId", precision_threshold: 5000 } } },
        },
      },
    },
  });

  const salesResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...commonFilters,
            {
              bool: {
                should: [
                  { range: { visitDate: { gte: start, lt: endDt } } },
                  { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        activeCurrent: {
          filter: { range: { visitDate: { gte: start, lt: endDt } } },
          aggs: { count: { cardinality: { field: "salesId", precision_threshold: 5000 } } },
        },
        activePrev: {
          filter: { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
          aggs: { count: { cardinality: { field: "salesId", precision_threshold: 5000 } } },
        },
      },
    },
  });

  const custQuery = { bool: { filter: [] } };
  if (region && region !== "All") custQuery.bool.filter.push({ term: { region } });
  if (channel && channel !== "All") custQuery.bool.filter.push({ term: { channel } });

  const totalOutletResp = await es.count({
    index: INDEX.CUSTOMERS,
    body: { query: custQuery }
  });

  const totalSalesResp = await es.search({
    index: INDEX.VISITS,
    body: {
      size: 0,
      query: { bool: { filter: commonFilters } },
      aggs: {
        total: { cardinality: { field: "salesId", precision_threshold: 5000 } },
      },
    },
  });

  return [
    {
      recordset: [{
        current: fotoResp.aggregations.current.count.value,
        prev: fotoResp.aggregations.prev.count.value,
      }],
    },
    {
      recordset: [{
        visitedCurrent: coverResp.aggregations.visitedCurrent.count.value,
        visitedPrev: coverResp.aggregations.visitedPrev.count.value,
        totalOutlet: totalOutletResp.count,
      }],
    },
    {
      recordset: [{
        activeCurrent: salesResp.aggregations.activeCurrent.count.value,
        activePrev: salesResp.aggregations.activePrev.count.value,
        totalSalesman: totalSalesResp.aggregations.total.value,
      }],
    },
  ];
};

const getTotalDistinctPhotos = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);
  const resp = await search({
    query: { bool: { filter: npnFilter(start, endDt, region, channel) } },
    aggs: {
      total: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
    },
  });
  return resp.aggregations.total.value;
};

const getPhotoByChannel = async (start, end, region, channel) => {
  const endDt = endPlusOne(end);
  const resp = await search({
    query: { bool: { filter: npnFilter(start, endDt, region, channel) } },
    aggs: {
      channels: {
        terms: { field: "channel", size: 20, order: { photo_count: "desc" } },
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
    query: {
      bool: {
        filter: [
          ...npnFilter(start, endDt, region, channel),
          {
            bool: {
              should: [
                { wildcard: { departmentName: "*Bima*" } },
                { wildcard: { departmentName: "*Arjuna*" } },
                { wildcard: { departmentName: "*Yudistira*" } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
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
        filter: [
          ...baseFilter(start, endDt, region, channel),
          { term: { isValidNPN: true } },
          { exists: { field: "brandName" } },
        ],
        must_not: [{ term: { brandName: "" } }],
      },
    },
    aggs: {
      brands: {
        terms: { field: "brandName", size: 10, order: { photo_count: "desc" } },
        aggs: {
          photo_count: { cardinality: { field: "imageUrl", precision_threshold: 5000 } },
        },
      },
    },
  });

  return {
    recordset: resp.aggregations.brands.buckets.map((b) => ({
      brand: b.key,
      totalPhotos: b.photo_count.value,
    })),
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
      return es.search({
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
      });
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
    es.count({ index: INDEX.CUSTOMERS, body: { query: custFilter } }),
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
  const nvResp = await es.search({
    index: INDEX.CUSTOMERS,
    body: { size: 5, query: custFilter, _source: ["custId", "name"] },
  });
  const notVisitedList = nvResp.hits.hits.map(h => ({ customerId: h._source.custId, customerName: h._source.name }));

  return [
    { list: notVisitedList, count: notVisitedCount },
    { list: lowList, count: lowCount },
    { list: doubleList, count: doubleCount },
  ];
};

const getDailyTrend = async (start, end, prevStart, prevEnd, region, channel) => {
  const endDt = endPlusOne(end);
  const prevEndDt = endPlusOne(prevEnd);

  const commonFilters = [
    { terms: { displayType: ["Regular", "Reguler"] } }
  ];
  if (region && region !== "All") commonFilters.push({ term: { region } });
  if (channel && channel !== "All") commonFilters.push({ term: { channel } });

  const resp = await search({
    query: {
      bool: {
        filter: [
          ...commonFilters,
          { term: { isValidNPN: true } },
          {
            bool: {
              should: [
                { range: { visitDate: { gte: start, lt: endDt } } },
                { range: { visitDate: { gte: prevStart, lt: prevEndDt } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: {
      current: {
        filter: { range: { visitDate: { gte: start, lt: endDt } } },
        aggs: {
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

  return [
    { recordset: currentBuckets },
    { recordset: prevBuckets },
  ];
};

const getDailyData = async (start, end, endDt, region, channel) => {
  const resp = await search({
    query: { bool: { filter: npnFilter(start, endDt, region, channel) } },
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
};
