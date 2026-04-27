import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});


export interface StatCard {
  value: number;
  prevValue: number;
  changePct: number | null;
  changeDirection: "up" | "down";
}

export interface CoverageOutlet extends StatCard {
  visitedOutlets: number;
  totalOutlets: number;
  targetPct: number;
}

export interface ActiveSalesman extends StatCard {
  activeCount: number;
  totalCount: number;
}

export interface OutletAktif {
  value: number;
  totalOutlets: number;
}

export interface OverviewResponse {
  period: {
    start: string;
    end: string;
    prevStart: string;
    prevEnd: string;
  };
  statCards: {
    totalFoto: StatCard;
    coverageOutlet: CoverageOutlet;
    avgFotoPerOutlet: StatCard;
    activeSalesman: ActiveSalesman;
    outletAktif: OutletAktif;
  };
}

export interface PerformanceResponse {
  channel: Array<{
    channel: string;
    totalPhotos: number;
    totalStores: number;
  }>;
  team: Array<{
    team: string;
    totalPhotos: number;
    totalStores: number;
  }>;
  brand: Array<{
    brand: string;
    totalPhotos: number;
    pct: number;
  }>;
  brandTotal: number;
}

export interface SalesmanData {
  salesman: string;
  team: string;
  totalPhotos: number;
  visitedOutlets: number;
  totalAssignedOutlets: number;
  outletCoverage: number;
}

export interface SalesmanResponse {
  top5: SalesmanData[];
  bottom5: SalesmanData[];
  all: SalesmanData[];
}

export interface DailyTrendResponse {
  current: Array<{
    tgl: string;
    totalPhotos: number;
  }>;
  prev: Array<{
    tgl: string;
    totalPhotos: number;
  }>;
  summary: {
    totalCurrent: number;
    totalPrev: number;
    changePct: number | null;
    changeDirection: "up" | "down";
  };
  prevPeriod: {
    prevStart: string;
    prevEnd: string;
  };
}

export interface OutletBelumDikunjungiItem {
  customerId: string;
  customerName: string;
}

export interface OutletFotoRendahItem {
  customerId: string;
  customerName: string;
  totalPhotos: number;
}

export interface OutletDoubleCoverageItem {
  customerId: string;
  customerName: string;
  salesmanCount: number;
  salesmanNames: string;
}

export interface OutletRiskResponse {
  belumDikunjungi: {
    total: number;
    items: OutletBelumDikunjungiItem[];
  };
  fotoRendah: {
    total: number;
    threshold: number;
    items: OutletFotoRendahItem[];
  };
  doubleCoverage: {
    total: number;
    items: OutletDoubleCoverageItem[];
  };
}


/**
 * Get overview statistics (5 stat cards)
 * @param start YYYY-MM-DD
 * @param end YYYY-MM-DD
 */
export async function getOverview(start: string, end: string, region?: string, channel?: string): Promise<OverviewResponse> {
  const params: any = { start, end };
  if (region && region !== "All") params.region = region;
  if (channel && channel !== "All") params.channel = channel;
  
  const res = await http.get<OverviewResponse>("/overview/overview", { params });
  return res.data;
}

/**
 * Get performance comparison (channel, team, brand)
 * @param start YYYY-MM-DD
 * @param end YYYY-MM-DD
 */
export async function getPerformance(start: string, end: string, region?: string, channel?: string): Promise<PerformanceResponse> {
  const params: any = { start, end };
  if (region && region !== "All") params.region = region;
  if (channel && channel !== "All") params.channel = channel;
  
  const res = await http.get<PerformanceResponse>("/overview/performance", { params });
  return res.data;
}

/**
 * Get salesman ranking (top 5 & bottom 5)
 * @param start YYYY-MM-DD
 * @param end YYYY-MM-DD
 */
export async function getSalesmanRanking(start: string, end: string, region?: string, channel?: string): Promise<SalesmanResponse> {
  const params: any = { start, end };
  if (region && region !== "All") params.region = region;
  if (channel && channel !== "All") params.channel = channel;
  
  const res = await http.get<SalesmanResponse>("/overview/salesman", { params });
  return res.data;
}

/**
 * Get daily trend chart data
 * @param start YYYY-MM-DD
 * @param end YYYY-MM-DD
 */
export async function getDailyTrend(start: string, end: string, region?: string, channel?: string): Promise<DailyTrendResponse> {
  const params: any = { start, end };
  if (region && region !== "All") params.region = region;
  if (channel && channel !== "All") params.channel = channel;
  
  const res = await http.get<DailyTrendResponse>("/overview/trend", { params });
  return res.data;
}

/**
 * Get outlet risk overview (belum dikunjungi, foto rendah, double coverage)
 * @param start     YYYY-MM-DD — awal bulan
 * @param end       YYYY-MM-DD — akhir bulan
 * @param weekStart YYYY-MM-DD — Senin minggu berjalan
 * @param weekEnd   YYYY-MM-DD — Minggu minggu berjalan
 */
export async function getOutletRisk(
  start: string,
  end: string,
  region?: string,
  channel?: string,
  weekStart?: string,
  weekEnd?: string
): Promise<OutletRiskResponse> {
  const params: any = { start, end };
  if (weekStart) params.weekStart = weekStart;
  if (weekEnd) params.weekEnd = weekEnd;
  if (region && region !== "All") params.region = region;
  if (channel && channel !== "All") params.channel = channel;

  const res = await http.get<OutletRiskResponse>("/overview/outlet-risk", { params });
  return res.data;
}

export interface FiltersResponse {
  channels: string[];
  regions: string[];
}

export async function getFilters(): Promise<FiltersResponse> {
  const res = await http.get<FiltersResponse>("/overview/filters");
  return res.data;
}
