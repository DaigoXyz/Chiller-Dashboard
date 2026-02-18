export type ErrorLogItemDto = {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  pipelineStatus?: 'success' | 'failed' | 'running' | 'warning';  
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

  offlineDevicesPie: {
    shortOffline: number;   // contoh: < 15 menit
    mediumOffline: number;  // 15–60 menit
    longOffline: number;    // > 60 menit
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