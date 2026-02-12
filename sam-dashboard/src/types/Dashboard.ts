export type ErrorLogItemDto = {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
};

export type DashboardDto = {
  metrics: {
    pushSuccessRate: number;
    activeOfflineDevices: number;
    priceAnomalies: number;
  };
  deviceSyncPie: {
    upToDate: number;
    failed: number;
    outdated: number;
  };
  syncSuccessSeries: {
    labels: string[];
    success: number[];
    failed: number[];
    delayed: number[];
  };
  offlineDevicesSeries: {
    labels: string[];
    counts: number[];
  };
  syncStatus: {
    sales: string;
    device: string;
    dataType: string;
    expectedVer: string;
    deviceVer: string;
    lastSync: string;
    status: "OK" | "OUTDATED" | "FAILED";
  }[];
  orderAnomalies: {
    orderId: string;
    sales: string;
    customer: string;
    priceVer: string;
    masterVer: string;
  }[];
  errorLogs: ErrorLogItemDto[];
};
