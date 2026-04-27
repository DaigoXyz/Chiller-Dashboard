const VISITS_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: "5s",
    "index.mapping.total_fields.limit": 50,
  },
  mappings: {
    properties: {
      docId: { type: "keyword" },
      visitDate: { type: "date", format: "yyyy-MM-dd" },
      displayType: { type: "keyword" },
      customerId: { type: "keyword" },
      customerName: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 256 } } },
      customerStatus: { type: "keyword" },
      customerActivityStatus: { type: "keyword" },
      channel: { type: "keyword" },
      region: { type: "keyword" },
      assignedSalesId: { type: "keyword" },
      salesId: { type: "keyword" },
      salesName: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 256 } } },
      departmentId: { type: "keyword" },
      departmentName: { type: "keyword" },
      imageUrl: { type: "keyword" },
      productId: { type: "keyword" },
      brandName: { type: "keyword" },
      isValidNPN: { type: "boolean" },
      syncedAt: { type: "date" },
      syncBatchId: { type: "keyword" },
    },
  },
};

const CUSTOMERS_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: "30s",
  },
  mappings: {
    properties: {
      custId: { type: "keyword" },
      name: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 256 } } },
      status: { type: "keyword" },
      activityStatus: { type: "keyword" },
      channel: { type: "keyword" },
      region: { type: "keyword" },
      salesId: { type: "keyword" },
    },
  },
};

module.exports = { VISITS_MAPPING, CUSTOMERS_MAPPING };
