import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import StatCard from "../components/StatCard";
import SalesmanRankTable from "../components/SalesmanRankTable";
import KeyInsights from "../components/InsightCard";
import LovModal, { type LovModalVariant, type LovModalRow } from "../components/LovModal";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "../components/LoadingSkeleton";
import {
  getOverview,
  getPerformance,
  getSalesmanRanking,
  getDailyTrend,
  getOutletRisk,
  getFilters,
  getAllSalesmanRanking,
  getAllNotVisitedOutlets,
  getAllLowPhotoOutlets,
  getAllDoubleOutlets,
  type OverviewResponse,
  type PerformanceResponse,
  type SalesmanResponse,
  type DailyTrendResponse,
  type OutletRiskResponse,
} from "../api/OverviewApi";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconCamera = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const IconStore = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconImage = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline strokeLinecap="round" strokeLinejoin="round" points="21 15 16 10 5 21" />
  </svg>
);
const IconUser = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBuilding = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);
const IconAlert = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconUsers = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconRefresh = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="23 4 23 10 17 10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);
const IconCheck = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" />
  </svg>
);
const IconCalendar = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconChevronDown = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="6 9 12 15 18 9" />
  </svg>
);
const IconRefreshCw = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="23 4 23 10 17 10" />
    <polyline strokeLinecap="round" strokeLinejoin="round" points="1 20 1 14 7 14" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const IconFilter = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polygon strokeLinecap="round" strokeLinejoin="round" points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// ─── MONTH DATA ────────────────────────────────────────────────────────────────
function generateMonths(): { label: string; value: string; endValue: string }[] {
  const months = [];
  const monthNames = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  for (let year = 2022; year <= currentYear; year++) {
    const maxMonth = year === currentYear ? currentMonth : 11;
    for (let m = 0; m <= maxMonth; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate();
      months.push({
        label: `${monthNames[m]} ${year}`,
        value: `${year}-${String(m + 1).padStart(2, "0")}-01`,
        endValue: `${year}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      });
    }
  }
  return months;
}
const MONTHS = generateMonths();

function getMonthLabel(startDate: string): string {
  return MONTHS.find((m) => m.value === startDate)?.label || startDate;
}

// ─── Page Header ──────────────────────────────────────────────────────────────
interface PageHeaderProps {
  selectedMonth: string;
  selectedRegion: string;
  selectedChannel: string;
  onMonthChange: (startDate: string, endDate: string) => void;
  onRegionChange: (region: string) => void;
  onChannelChange: (channel: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  loadingFilters?: boolean;
  regionOptions: string[];
  channelOptions: string[];
}

function PageHeader({
  selectedMonth,
  selectedRegion,
  selectedChannel,
  onMonthChange,
  onRegionChange,
  onChannelChange,
  onRefresh,
  isLoading,
  loadingFilters = false,
  regionOptions,
  channelOptions,
}: PageHeaderProps) {
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const monthLabel = getMonthLabel(selectedMonth);

  React.useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleMonthSelect = (startDate: string, endDate: string) => {
    onMonthChange(startDate, endDate);
    setOpenDropdown(null);
  };
  const handleRegionSelect = (region: string) => {
    onRegionChange(region);
    setOpenDropdown(null);
  };
  const handleChannelSelect = (channel: string) => {
    onChannelChange(channel);
    setOpenDropdown(null);
  };

  const dropdownItemClass = (active: boolean) =>
    `w-full text-left px-4 py-2 text-sm ${
      active
        ? "bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
        : "text-gray-700 hover:bg-gray-50"
    }`;

  const FilterDropdown = ({
    id, label, value, children, loading, minWidth = "w-[130px]",
  }: {
    id: string; label: string; value: string; children: React.ReactNode; loading?: boolean; minWidth?: string;
  }) => (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      {loading ? (
        <div className={`flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white ${minWidth} h-[40px] sm:h-[46px]`}>
          <div className="flex flex-col gap-1.5 w-full">
            <div className="h-1.5 w-8 bg-gray-200 animate-pulse rounded" />
            <div className="h-2.5 w-12 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="w-3.5 h-3.5 bg-gray-200 animate-pulse rounded ml-auto flex-shrink-0" />
        </div>
      ) : (
        <button
          onClick={(e) => toggleDropdown(id, e)}
          className={`flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700 ${minWidth}`}
        >
          <div className="text-left flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">{label}</p>
            <p className="font-medium leading-none text-[12px] sm:text-[13px] truncate">{value}</p>
          </div>
          <IconChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </button>
      )}
      {!loading && openDropdown === id && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">Visibility Analytics Dashboard</h1>
          <p className="text-[11px] sm:text-[13px] text-gray-500 mt-0.5 truncate">Overview Performance - {monthLabel}</p>
        </div>

        {/* Desktop filters */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => toggleDropdown("periode", e)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700"
            >
              <IconCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Periode</p>
                <p className="font-medium leading-none text-[12px] lg:text-[13px]">{monthLabel}</p>
              </div>
              <IconChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </button>
            {openDropdown === "periode" && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 max-h-72 overflow-y-auto">
                {[...MONTHS].reverse().map((month) => (
                  <button key={month.value} onClick={() => handleMonthSelect(month.value, month.endValue)} className={dropdownItemClass(selectedMonth === month.value)}>
                    {month.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FilterDropdown id="region" label="Region" value={selectedRegion} loading={loadingFilters} minWidth="w-[120px] lg:w-[130px]">
            <button onClick={() => handleRegionSelect("Semua")} className={dropdownItemClass(selectedRegion === "Semua")}>Semua</button>
            {regionOptions.map((r) => (
              <button key={r} onClick={() => handleRegionSelect(r)} className={dropdownItemClass(selectedRegion === r)}>{r}</button>
            ))}
          </FilterDropdown>

          <FilterDropdown id="channel" label="Channel" value={selectedChannel} loading={loadingFilters} minWidth="w-[120px] lg:w-[130px]">
            <button onClick={() => handleChannelSelect("Semua")} className={dropdownItemClass(selectedChannel === "Semua")}>Semua</button>
            {channelOptions.map((c) => (
              <button key={c} onClick={() => handleChannelSelect(c)} className={dropdownItemClass(selectedChannel === c)}>{c}</button>
            ))}
          </FilterDropdown>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`flex items-center justify-center w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] border border-gray-200 rounded-lg flex-shrink-0 ${isLoading ? "bg-gray-100" : "bg-white hover:bg-gray-50"}`}
          >
            <IconRefreshCw className={`w-4 h-4 ${isLoading ? "text-gray-300 animate-spin" : "text-gray-500"}`} />
          </button>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-2 flex-shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`flex items-center justify-center w-9 h-9 border border-gray-200 rounded-lg ${isLoading ? "bg-gray-100" : "bg-white hover:bg-gray-50"}`}
          >
            <IconRefreshCw className={`w-4 h-4 ${isLoading ? "text-gray-300 animate-spin" : "text-gray-500"}`} />
          </button>
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-1.5 px-3 h-9 border rounded-lg text-[12px] font-medium transition-colors ${
              showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <IconFilter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* Mobile filter panel */}
      {showFilters && (
        <div className="mt-3 md:hidden flex flex-col gap-2 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => toggleDropdown("m-periode", e)}
              className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 text-sm text-gray-700"
            >
              <IconCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Periode</p>
                <p className="font-medium leading-none text-[13px]">{monthLabel}</p>
              </div>
              <IconChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {openDropdown === "m-periode" && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                {[...MONTHS].reverse().map((month) => (
                  <button key={month.value} onClick={() => handleMonthSelect(month.value, month.endValue)} className={dropdownItemClass(selectedMonth === month.value)}>
                    {month.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => toggleDropdown("m-region", e)}
                className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 text-sm text-gray-700"
              >
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">Region</p>
                  <p className="font-medium leading-none text-[13px] truncate">{selectedRegion}</p>
                </div>
                <IconChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>
              {openDropdown === "m-region" && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 max-h-52 overflow-y-auto">
                  <button onClick={() => handleRegionSelect("Semua")} className={dropdownItemClass(selectedRegion === "Semua")}>Semua</button>
                  {regionOptions.map((r) => (
                    <button key={r} onClick={() => handleRegionSelect(r)} className={dropdownItemClass(selectedRegion === r)}>{r}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-1" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => toggleDropdown("m-channel", e)}
                className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 text-sm text-gray-700"
              >
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">Channel</p>
                  <p className="font-medium leading-none text-[13px] truncate">{selectedChannel}</p>
                </div>
                <IconChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>
              {openDropdown === "m-channel" && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 max-h-52 overflow-y-auto">
                  <button onClick={() => handleChannelSelect("Semua")} className={dropdownItemClass(selectedChannel === "Semua")}>Semua</button>
                  {channelOptions.map((c) => (
                    <button key={c} onClick={() => handleChannelSelect(c)} className={dropdownItemClass(selectedChannel === c)}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comparison Card ──────────────────────────────────────────────────────────
interface ComparisonCardProps {
  items: Array<{ label: string; value: number }>;
  onCancel: () => void;
  color?: string;
  title?: string;
}

function ComparisonCard({ items, onCancel, color = "#3B82F6", title = "" }: ComparisonCardProps) {
  if (items.length !== 2) return null;
  const [a, b] = items;
  const diff = b.value > 0 ? ((a.value - b.value) / b.value) * 100 : 0;
  const isPositive = diff >= 0;
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const diffStr = `${isPositive ? "+" : ""}${diff.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const COLORS = [color, "#10B981"];
  const truncate = (s: string) => s.length > 12 ? s.slice(0, 12) + "\u2026" : s;

  const chartOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%", distributed: true, dataLabels: { position: "top" } } },
    colors: COLORS,
    dataLabels: {
      enabled: true,
      formatter: (val: number) => fmt(val),
      style: { fontSize: "11px", fontWeight: "600", colors: ["#374151"] },
      offsetY: -22,
    },
    legend: { show: false },
    grid: { borderColor: "#f3f4f6", yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: [a.label, b.label],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", fontWeight: "500", colors: "#6B7280" }, formatter: (val: string) => truncate(val) },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val >= 1000 ? (val / 1000).toFixed(0) + "K" : String(val),
        style: { fontSize: "10px", colors: "#9CA3AF" },
      },
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px" },
      x: { formatter: (_val: any, opts: any) => [a.label, b.label][opts?.dataPointIndex] ?? "" },
      y: { formatter: (val: number) => fmt(val) },
    },
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600">{title}</p>
        <button onClick={onCancel} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1 transition-colors">
          ✕ Batal
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <div className="w-full sm:flex-1" style={{ minWidth: 0, overflow: "hidden" }}>
          <ReactApexChart
            key={`${a.label}||${b.label}`}
            options={chartOptions}
            series={[{ name: title, data: [a.value, b.value] }]}
            type="bar"
            height={200}
            width="100%"
          />
        </div>
        <div className="w-full sm:flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-center sm:w-[110px]">
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium mb-1">{a.label} vs {b.label}</p>
          <p className={`text-xl font-bold leading-tight ${isPositive ? "text-emerald-500" : "text-red-500"}`}>{diffStr}</p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 leading-snug">
            {isPositive ? `lebih banyak ${a.label}` : `lebih sedikit ${a.label}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
interface HorizBarChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
  loading?: boolean;
}

function HorizBarChart({ title, data, color = "#3B82F6", loading = false }: HorizBarChartProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [showComparison, setShowComparison] = React.useState(false);

  React.useEffect(() => {
    setSelected([]);
    setShowComparison(false);
  }, [data]);

  if (loading) return <ChartSkeleton />;

  const INITIAL_COUNT = 5;
  const displayData = expanded ? data : data.slice(0, INITIAL_COUNT);
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toLocaleString("id-ID"));
  const hiddenCount = data.length - INITIAL_COUNT;

  const handleBarClick = (globalIdx: number) => {
    setSelected((prev) => {
      if (prev.includes(globalIdx)) {
        const next = prev.filter((i) => i !== globalIdx);
        if (next.length < 2) setShowComparison(false);
        return next;
      }
      if (prev.length >= 2) return [prev[prev.length - 1], globalIdx];
      const next = [...prev, globalIdx];
      if (next.length === 2) setShowComparison(true);
      return next;
    });
  };

  const selectedItems = selected.map((idx) => data[idx]).filter(Boolean);

  return (
    <div className="w-full">
      {showComparison && selectedItems.length === 2 ? (
        <ComparisonCard
          items={selectedItems}
          onCancel={() => { setShowComparison(false); setSelected([]); }}
          color={color}
          title={title}
        />
      ) : (
        <>
          <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600 mb-1">{title}</p>
          <p className="text-[10px] text-gray-400 mb-2 italic">Klik 2 bar untuk membandingkan</p>

          <div
            className="flex flex-col gap-2 sm:gap-2.5 overflow-y-auto transition-all duration-300"
            style={{ maxHeight: expanded ? "260px" : "auto" }}
          >
            {displayData.map((d, i) => {
              const globalIdx = data.indexOf(d);
              const pct = Math.round((d.value / maxVal) * 100);
              const isSelected = selected.includes(globalIdx);
              const selOrder = selected.indexOf(globalIdx);

              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 cursor-pointer rounded-lg px-1 py-0.5 transition-all duration-150 ${
                    isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleBarClick(globalIdx)}
                >
                  <div className="w-4 flex-shrink-0 flex items-center justify-center">
                    {isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {selOrder + 1}
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-200" />
                    )}
                  </div>
                  <div className="w-20 sm:w-24 flex-shrink-0 text-[10px] sm:text-[11px] text-gray-600 truncate text-right pr-1" title={d.label}>
                    {d.label}
                  </div>
                  <div className="flex-1 h-4 sm:h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, 8)}%`,
                        background: selected.length > 0 && !isSelected ? "#CBD5E1" : color,
                      }}
                    >
                      <span className="text-[9px] sm:text-[10px] font-bold text-white leading-none">{fmt(d.value)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-2 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-blue-500 hover:text-blue-700 hover:underline transition-colors"
            >
              {expanded ? "Sembunyikan ↑" : `+${hiddenCount} lainnya → tampilkan semua`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Brand Donut Chart ────────────────────────────────────────────────────────
interface BrandDonutChartProps {
  data?: Array<{ brand: string; totalPhotos: number; pct: number }>;
  total?: number;
  loading?: boolean;
}

function BrandDonutChart({ data, total = 0, loading = false }: BrandDonutChartProps) {
  const PALETTE = [
    "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
    "#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
  ];
  const chartData = (data ?? []).slice(0, 10);
  const series = chartData.map((b) => b.totalPhotos);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const handleLegendClick = (idx: number) => {
    const next = selectedIdx === idx ? null : idx;
    setSelectedIdx(next);

    requestAnimationFrame(() => {
      if (!wrapperRef.current) return;
      const slices = wrapperRef.current.querySelectorAll(".apexcharts-pie-series path");

      if (next === null) {
        const tooltip = wrapperRef.current.querySelector(".apexcharts-tooltip") as HTMLElement | null;
        if (tooltip) tooltip.style.opacity = "0";
        const valEl = wrapperRef.current.querySelector(".apexcharts-datalabel-value") as HTMLElement | null;
        const lblEl = wrapperRef.current.querySelector(".apexcharts-datalabel-label") as HTMLElement | null;
        if (valEl) valEl.textContent = total.toLocaleString("id-ID");
        if (lblEl) lblEl.textContent = "Total";
        return;
      }

      const target = slices[next] as SVGPathElement | undefined;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      target.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
      target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: cx, clientY: cy, screenX: cx, screenY: cy }));
    });
  };

  const options = {
    chart: {
      type: "donut" as const,
      fontFamily: "inherit",
      animations: { speed: 600 },
      events: {
        dataPointSelection: (_e: any, _chart: any, opts: any) => {
          const idx = opts.dataPointIndex;
          setSelectedIdx((prev) => (prev === idx ? null : idx));
        },
      },
    },
    colors: PALETTE,
    labels: chartData.map((b) => b.brand),
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "10px",
              color: "#9CA3AF",
              formatter: () => total.toLocaleString("id-ID"),
            },
            value: {
              show: true,
              fontSize: "16px",
              fontWeight: "700",
              color: "#1F2937",
              formatter: (val: string) => {
                const n = Number(val);
                return n >= 1000 ? (n / 1000).toFixed(0) + "K" : String(n);
              },
            },
          },
        },
      },
    },
    stroke: { width: 1.5, colors: ["#fff"] },
    tooltip: {
      y: { formatter: (val: number) => val.toLocaleString("id-ID") + " foto" },
      theme: "light" as const,
    },
    states: { active: { filter: { type: "darken", value: 0.7 } } },
  };

  if (loading) return <ChartSkeleton />;

  return (
    <div className="w-full">
      <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600 mb-2">
        JUMLAH FOTO PER PRINCIPAL
      </p>
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-shrink-0" ref={wrapperRef}>
          <ReactApexChart options={options} series={series} type="donut" height={180} width={160} />
        </div>
        <div className="flex-1 overflow-y-auto max-h-[200px] flex flex-col gap-1 sm:gap-1.5 pr-1">
          {chartData.map((brand, idx) => {
            const isSelected = selectedIdx === idx;
            const isDimmed = selectedIdx !== null && !isSelected;
            return (
              <div
                key={idx}
                onClick={() => handleLegendClick(idx)}
                className={`flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 cursor-pointer rounded-lg px-1 sm:px-1.5 py-0.5 transition-all duration-150 ${
                  isSelected ? "bg-gray-100 ring-1 ring-gray-300" : "hover:bg-gray-50"
                }`}
                style={{ opacity: isDimmed ? 0.35 : 1 }}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <span
                    className="flex-shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-transform duration-150"
                    style={{ background: PALETTE[idx % PALETTE.length], transform: isSelected ? "scale(1.4)" : "scale(1)" }}
                  />
                  <span className={`text-[10px] sm:text-[11px] truncate transition-colors ${isSelected ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                    {brand.brand}
                  </span>
                </div>
                <span className={`flex-shrink-0 text-[10px] sm:text-[11px] font-medium transition-colors ${isSelected ? "text-gray-800 font-bold" : "text-gray-400"}`}>
                  {brand.pct}%
                </span>
              </div>
            );
          })}
          <div className="pt-1 sm:pt-1.5 mt-0.5 border-t border-gray-100 flex justify-between">
            <span className="text-[10px] text-gray-400">Total</span>
            <span className="text-[11px] sm:text-[12px] font-bold text-gray-700">{total.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
interface TrendChartProps {
  currentMonth?: { tgl: string; totalPhotos: number }[];
  prevMonth?: { tgl: string; totalPhotos: number }[];
  summary?: {
    totalCurrent: number;
    totalPrev: number;
    changePct: number | null;
    changeDirection: "up" | "down";
  };
  currentLabel?: string;
  prevLabel?: string;
  loading?: boolean;
}

function TrendChart({
  currentMonth = [],
  prevMonth = [],
  summary,
  currentLabel = "Current Month",
  prevLabel = "Previous Month",
  loading = false,
}: TrendChartProps) {
  const inferredMonthDays = React.useMemo(() => {
    let year: number, month: number;
    if (currentMonth.length > 0) {
      const d = new Date(currentMonth[0].tgl);
      year = d.getFullYear();
      month = d.getMonth();
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  const trendCurrent = React.useMemo(() => {
    const map: Record<number, number> = {};
    currentMonth.forEach((d) => { const day = new Date(d.tgl).getDate(); map[day] = d.totalPhotos; });
    return Array.from({ length: inferredMonthDays }, (_, i) => map[i + 1] ?? 0);
  }, [currentMonth, inferredMonthDays]);

  const trendPrev = React.useMemo(() => {
    const map: Record<number, number> = {};
    prevMonth.forEach((d) => { const day = new Date(d.tgl).getDate(); map[day] = d.totalPhotos; });
    return Array.from({ length: inferredMonthDays }, (_, i) => map[i + 1] ?? 0);
  }, [prevMonth, inferredMonthDays]);

  const trendDays = Array.from({ length: inferredMonthDays }, (_, i) => `${i + 1}`);

  const options = {
    chart: { type: "line" as const, toolbar: { show: false }, fontFamily: "inherit", animations: { speed: 600 }, zoom: { enabled: false } },
    colors: ["#3B82F6", "#D1D5DB"],
    stroke: { curve: "smooth" as const, width: [2.5, 2], dashArray: [0, 6] },
    markers: { size: [3, 0], colors: ["#3B82F6"], strokeColors: "#fff", strokeWidth: 2 },
    grid: { borderColor: "#f3f4f6", yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    legend: { show: false },
    xaxis: {
      categories: trendDays,
      tickAmount: 10,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "10px", colors: "#9CA3AF" }, rotate: 0 },
    },
    yaxis: {
      min: 0,
      max: Math.max(...trendCurrent, ...trendPrev, 1000),
      tickAmount: 4,
      labels: {
        formatter: (v: number) => (v >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)),
        style: { fontSize: "10px", colors: "#9CA3AF" },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light" as const,
      style: { fontSize: "12px" },
      x: { formatter: (_val: number, opts?: { dataPointIndex?: number }) => `Hari ke-${(opts?.dataPointIndex ?? 0) + 1}` },
      y: { formatter: (v: number | null) => v === null || v === undefined ? "–" : (v as number).toLocaleString("id-ID") + " foto" },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="bg-gray-200 animate-pulse rounded h-3 w-40 sm:w-48" />
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-gray-200 animate-pulse rounded h-3 w-20 sm:w-24" />
            <div className="bg-gray-200 animate-pulse rounded h-3 w-20 sm:w-24" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:flex-1">
            <div className="bg-gray-200 animate-pulse rounded h-[160px] sm:h-[200px] w-full" />
          </div>
          <div className="w-full sm:flex-shrink-0 sm:w-[130px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-row sm:flex-col gap-3 sm:gap-2 items-center justify-between sm:justify-center">
            <div className="bg-gray-200 animate-pulse rounded h-3 w-20" />
            <div className="bg-gray-200 animate-pulse rounded h-7 w-16" />
            <div className="bg-gray-200 animate-pulse rounded h-3 w-14" />
            <div className="bg-gray-200 animate-pulse rounded h-4 w-12" />
          </div>
        </div>
      </div>
    );
  }

  const changePct = summary?.changePct ?? 0;
  const direction = summary?.changeDirection ?? "up";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600">
          TREND JUMLAH FOTO HARIAN
        </p>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 sm:w-6 h-[2px] bg-blue-500 rounded" /> {currentLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 sm:w-6 border-t-2 border-dashed border-gray-400" />{" "}{prevLabel}
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
        <div className="w-full sm:flex-1 min-w-0">
          <ReactApexChart
            options={options}
            series={[{ name: currentLabel, data: trendCurrent }, { name: prevLabel, data: trendPrev }]}
            type="line"
            height={180}
          />
        </div>
        <div className="w-full sm:flex-shrink-0 sm:w-[130px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-row sm:flex-col items-center gap-4 sm:gap-0 sm:text-center justify-around sm:justify-start">
          <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase sm:mb-1">
            TOTAL {currentLabel.toUpperCase()}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {(summary?.totalCurrent ?? 0).toLocaleString("id-ID")}
          </p>
          <div className="flex flex-col items-center sm:items-center">
            <p className="text-[10px] sm:text-[11px] text-gray-400 sm:mt-0.5">vs {prevLabel}</p>
            <p className={`text-[12px] sm:text-[13px] font-bold sm:mt-0.5 ${direction === "up" ? "text-emerald-500" : "text-red-500"}`}>
              {direction === "up" ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Outlet Risk Overview ─────────────────────────────────────────────────────
interface OutletRiskOverviewProps {
  data?: OutletRiskResponse | null;
  loading?: boolean;
  onLihatSemua?: (type: "belumDikunjungi" | "fotoRendah" | "doubleCoverage") => void;
}

function OutletRiskOverview({ data, loading = false, onLihatSemua }: OutletRiskOverviewProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
        <div className="bg-gray-200 animate-pulse rounded h-3 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="bg-gray-200 animate-pulse rounded h-3 w-24" />
              <div className="bg-gray-200 animate-pulse rounded h-6 w-20 mb-1" />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="bg-gray-100 animate-pulse rounded h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const PREVIEW = 5;

  const normalize = (raw: any): { total: number; items: any[] } | null => {
    if (!raw) return null;
    if (Array.isArray(raw)) return { total: raw.length, items: raw };
    if (typeof raw === "object" && "items" in raw) return { total: raw.total ?? raw.items?.length ?? 0, items: raw.items ?? [] };
    return null;
  };

  const belumDikunjungi = normalize(data?.belumDikunjungi);
  const fotoRendah      = normalize(data?.fotoRendah);
  const doubleCoverage  = normalize(data?.doubleCoverage);

  const getName = (o: any) => o?.customerName ?? o?.szName ?? o?.name ?? o?.customer ?? "—";
  const getPhotos = (o: any) => o?.totalPhotos ?? o?.photos ?? o?.foto ?? "—";
  const getSalesmanCount = (o: any) => o?.salesmanCount ?? o?.count ?? o?.salesman ?? "—";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600 mb-4">
        OUTLET RISK OVERVIEW
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">

        {/* Belum Dikunjungi */}
        <div className="flex flex-col">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide sm:h-[28px] leading-[14px] mb-1 sm:mb-0">
            Outlet Belum Dikunjungi
          </p>
          <div className="mb-2 sm:mb-3">
            <span className="text-xl sm:text-2xl font-bold text-red-500">{belumDikunjungi ? belumDikunjungi.total.toLocaleString("id-ID") : "—"}</span>
            <span className="text-xs sm:text-sm text-red-400 ml-1.5">Outlet</span>
          </div>
          <div className="space-y-1 flex-1">
            {(belumDikunjungi?.items ?? []).slice(0, PREVIEW).map((o, i) => (
              <p key={i} className="text-[11px] sm:text-[12px] text-gray-600 leading-6 truncate h-[24px]" title={getName(o)}>
                {getName(o)}
              </p>
            ))}
          </div>
          <button
            onClick={() => onLihatSemua?.("belumDikunjungi")}
            className="mt-2 flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-blue-600 hover:underline"
          >
            Lihat semua <span>→</span>
          </button>
        </div>

        {/* Foto Rendah */}
        <div className="flex flex-col pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide sm:h-[28px] leading-[14px] mb-1 sm:mb-0">
            Foto Rendah (&lt;{data?.fotoRendah?.threshold ?? 3} Foto)
          </p>
          <div className="mb-2 sm:mb-3">
            <span className="text-xl sm:text-2xl font-bold text-yellow-500">{fotoRendah ? fotoRendah.total.toLocaleString("id-ID") : "—"}</span>
            <span className="text-xs sm:text-sm text-yellow-400 ml-1.5">Outlet</span>
          </div>
          <div className="space-y-1 flex-1">
            {(fotoRendah?.items ?? []).slice(0, PREVIEW).map((o, i) => (
              <div key={i} className="flex justify-between text-[11px] sm:text-[12px] leading-6 gap-1 min-w-0 h-[24px]">
                <span className="text-gray-600 truncate" title={getName(o)}>{getName(o)}</span>
                <span className="text-gray-400 flex-shrink-0">{getPhotos(o)} foto</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onLihatSemua?.("fotoRendah")}
            className="mt-2 flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-blue-600 hover:underline"
          >
            Lihat semua <span>→</span>
          </button>
        </div>

        {/* Double Coverage */}
        <div className="flex flex-col pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide sm:h-[28px] leading-[14px] mb-1 sm:mb-0">
            Double Coverage
          </p>
          <div className="mb-2 sm:mb-3">
            <span className="text-xl sm:text-2xl font-bold text-blue-500">{doubleCoverage ? doubleCoverage.total.toLocaleString("id-ID") : "—"}</span>
            <span className="text-xs sm:text-sm text-blue-400 ml-1.5">Outlet</span>
          </div>
          <div className="space-y-1 flex-1">
            {(doubleCoverage?.items ?? []).slice(0, PREVIEW).map((o, i) => (
              <div key={i} className="flex justify-between text-[11px] sm:text-[12px] leading-6 gap-1 min-w-0 h-[24px]">
                <span className="text-gray-600 truncate" title={getName(o)}>{getName(o)}</span>
                <span className="text-gray-400 flex-shrink-0">{getSalesmanCount(o)} Salesman</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onLihatSemua?.("doubleCoverage")}
            className="mt-2 flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-blue-600 hover:underline"
          >
            Lihat semua <span>→</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ChillerOverviewPage() {
  const currentMonthEntry = MONTHS[MONTHS.length - 1];
  const [selectedMonth, setSelectedMonth] = useState(currentMonthEntry.value);
  const [selectedEndDate, setSelectedEndDate] = useState(currentMonthEntry.endValue);
  const [selectedRegion, setSelectedRegion] = useState("Semua");
  const [selectedChannel, setSelectedChannel] = useState("Semua");

  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [loadingSalesman, setLoadingSalesman] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingOutletRisk, setLoadingOutletRisk] = useState(true);

  const isLoading = loadingOverview || loadingPerformance || loadingSalesman || loadingTrend || loadingOutletRisk;

  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceResponse | null>(null);
  const [salesmanData, setSalesmanData] = useState<SalesmanResponse | null>(null);
  const [trendData, setTrendData] = useState<DailyTrendResponse | null>(null);
  const [outletRiskData, setOutletRiskData] = useState<OutletRiskResponse | null>(null);

  // ─── LOV Modal state ───────────────────────────────────────────────────────
  const [lovOpen, setLovOpen] = useState(false);
  const [lovVariant, setLovVariant] = useState<LovModalVariant>("salesman-top");
  const [lovTitle, setLovTitle] = useState("");

  const openLov = (variant: LovModalVariant, title: string) => {
    setLovVariant(variant);
    setLovTitle(title);
    setLovOpen(true);
  };

  const handleLovFetch = async ({
    page,
    limit,
    search,
  }: {
    page: number;
    limit: number;
    search: string;
  }): Promise<{ data: LovModalRow[]; pagination: any }> => {
    const apiRegion  = selectedRegion  === "Semua" ? undefined : selectedRegion;
    const apiChannel = selectedChannel === "Semua" ? undefined : selectedChannel;

    switch (lovVariant) {
      case "salesman-top":
        return getAllSalesmanRanking(selectedMonth, selectedEndDate, apiRegion, apiChannel, "top", page, limit, search) as any;
      case "salesman-bottom":
        return getAllSalesmanRanking(selectedMonth, selectedEndDate, apiRegion, apiChannel, "bottom", page, limit, search) as any;
      case "not-visited":
        return getAllNotVisitedOutlets(selectedMonth, selectedEndDate, apiRegion, apiChannel, page, limit, search) as any;
      case "low-photo":
        return getAllLowPhotoOutlets(selectedMonth, selectedEndDate, apiRegion, apiChannel, page, limit, search) as any;
      case "double-coverage":
        return getAllDoubleOutlets(selectedMonth, selectedEndDate, apiRegion, apiChannel, page, limit, search) as any;
      default:
        return { data: [], pagination: { page: 1, limit, totalRows: 0, totalPages: 0 } };
    }
  };

  // ─── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingFilters(true);
    getFilters()
      .then((data) => { setRegionOptions(data.regions ?? []); setChannelOptions(data.channels ?? []); })
      .catch((err) => console.error("❌ [API] getFilters", err))
      .finally(() => setLoadingFilters(false));
  }, []);

  const fetchAllData = (startDate: string, endDate: string, region: string, channel: string) => {
    setError(null);
    setLoadingOverview(true);
    setLoadingPerformance(true);
    setLoadingSalesman(true);
    setLoadingTrend(true);
    setLoadingOutletRisk(true);

    const apiRegion = region === "Semua" ? undefined : region;
    const apiChannel = channel === "Semua" ? undefined : channel;

    getOverview(startDate, endDate, apiRegion, apiChannel)
      .then(setOverviewData)
      .catch((err: any) => { console.error("❌ Overview error", err); setError("Gagal mengambil data Overview."); })
      .finally(() => setLoadingOverview(false));

    getPerformance(startDate, endDate, apiRegion, apiChannel)
      .then(setPerformanceData)
      .catch((err: any) => console.error("❌ Performance error", err))
      .finally(() => setLoadingPerformance(false));

    getSalesmanRanking(startDate, endDate, apiRegion, apiChannel)
      .then(setSalesmanData)
      .catch((err: any) => console.error("❌ Salesman error", err))
      .finally(() => setLoadingSalesman(false));

    getDailyTrend(startDate, endDate, apiRegion, apiChannel)
      .then(setTrendData)
      .catch((err: any) => console.error("❌ Trend error", err))
      .finally(() => setLoadingTrend(false));

    getOutletRisk(startDate, endDate, apiRegion, apiChannel)
      .then(setOutletRiskData)
      .catch((err: any) => console.error("❌ Outlet Risk error", err))
      .finally(() => setLoadingOutletRisk(false));
  };

  useEffect(() => {
    fetchAllData(selectedMonth, selectedEndDate, selectedRegion, selectedChannel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (startDate: string, endDate: string) => {
    setSelectedMonth(startDate);
    setSelectedEndDate(endDate);
    fetchAllData(startDate, endDate, selectedRegion, selectedChannel);
  };
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    fetchAllData(selectedMonth, selectedEndDate, region, selectedChannel);
  };
  const handleChannelChange = (channel: string) => {
    setSelectedChannel(channel);
    fetchAllData(selectedMonth, selectedEndDate, selectedRegion, channel);
  };
  const handleRefresh = () => {
    fetchAllData(selectedMonth, selectedEndDate, selectedRegion, selectedChannel);
  };

  const stats = overviewData?.statCards ?? null;
  const prevMonthLabel = overviewData?.period?.prevStart
    ? new Date(overviewData.period.prevStart).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    : "Previous Month";

  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-5 lg:p-6 bg-gray-50 min-h-full">

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 sm:px-8 py-5 sm:py-6 text-center max-w-md w-full">
            <p className="text-red-600 font-bold text-sm sm:text-base mb-1">Gagal memuat data</p>
            <p className="text-red-400 text-xs sm:text-sm mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        selectedMonth={selectedMonth}
        selectedRegion={selectedRegion}
        selectedChannel={selectedChannel}
        onMonthChange={handleMonthChange}
        onRegionChange={handleRegionChange}
        onChannelChange={handleChannelChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        loadingFilters={loadingFilters}
        regionOptions={regionOptions}
        channelOptions={channelOptions}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {loadingOverview ? (
          [1, 2, 3, 4, 5].map((i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard
              icon={<IconCamera className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />}
              iconBg="bg-blue-100" iconColor="text-blue-500"
              label="Total Foto"
              value={stats.totalFoto.value.toLocaleString("id-ID")}
            />
            <StatCard
              icon={<IconStore className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />}
              iconBg="bg-green-100" iconColor="text-green-500"
              label="Coverage Outlet"
              value={stats.coverageOutlet.value.toFixed(1) + "%"}
              target={`Target ${stats.coverageOutlet.targetPct}%`}
            />
            <StatCard
              icon={<IconImage className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />}
              iconBg="bg-purple-100" iconColor="text-purple-500"
              label="Avg Foto / Outlet"
              value={(() => {
                const total = stats.totalFoto.value;
                const outlets = stats.outletAktif?.value;
                if (!outlets || outlets === 0) return "0";
                return Math.round(total / outlets).toLocaleString("id-ID");
              })()}
            />
            <StatCard
              icon={<IconUser className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />}
              iconBg="bg-yellow-100" iconColor="text-yellow-500"
              label="Active Salesman"
              value={stats.activeSalesman.value.toFixed(1) + "%"}
              target={`${stats.activeSalesman.activeCount} / ${stats.activeSalesman.totalCount}`}
            />
            <div className="col-span-2 sm:col-span-1">
              <StatCard
                icon={<IconBuilding className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />}
                iconBg="bg-cyan-100" iconColor="text-cyan-500"
                label="Outlet Aktif"
                value={stats.outletAktif.value.toLocaleString("id-ID")}
                target={`dari ${stats.outletAktif.totalOutlets.toLocaleString("id-ID")} Outlet`}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Key Insights */}
      {(loadingOverview || loadingPerformance || loadingOutletRisk) ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
          <div className="h-3 w-28 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="flex gap-3 overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-5">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 flex gap-3 items-start flex-shrink-0 sm:flex-shrink min-w-[200px] sm:min-w-0">
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" />
                  <div className="h-2 w-1/2 bg-gray-100 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (() => {
        const notVisited      = outletRiskData?.belumDikunjungi;
        const totalOutlets    = stats?.outletAktif?.totalOutlets ?? 0;
        const notVisitedCount = notVisited?.total ?? 0;
        const notVisitedPct   = totalOutlets > 0 ? Math.round((notVisitedCount / totalOutlets) * 100) : 0;
        const insightNotVisited = {
          icon: <IconAlert />,
          variant: (notVisitedPct > 0 ? "danger" : "success") as any,
          text: notVisitedPct > 0
            ? `**${notVisitedPct}% outlet belum dikunjungi bulan ini**`
            : `**Semua outlet sudah dikunjungi bulan ini**`,
          subtext: notVisitedPct > 0 ? `${notVisitedCount.toLocaleString("id-ID")} dari ${totalOutlets.toLocaleString("id-ID")} outlet` : undefined,
        };

        // Coverage vs target 80%
        const coveragePct = stats?.coverageOutlet?.value ?? 0;
        const coverageTarget = stats?.coverageOutlet?.targetPct ?? 80;
        const coverageGap = coveragePct - coverageTarget;
        const visitedOutletsStr = (stats?.coverageOutlet?.visitedOutlets ?? 0).toLocaleString("id-ID");
        const totalOutletsStr = (stats?.coverageOutlet?.totalOutlets ?? 0).toLocaleString("id-ID");
        const insightCoverage = {
          icon: <IconStore className="w-4 h-4" />,
          variant: (coveragePct >= coverageTarget ? "success" : "danger") as any,
          text: `**${coveragePct.toFixed(1)}% coverage (${visitedOutletsStr}/${totalOutletsStr} outlet)**`,
        };

        let insightTeam = null;
        // Use brand data (from donut chart) instead of team/sales type
        const principals = [...(performanceData?.brand ?? [])].sort((a, b) => b.totalPhotos - a.totalPhotos);
        if (principals.length >= 2 && principals[1].totalPhotos > 0) {
          const top    = principals[0];
          const second = principals[1];
          const diff    = ((second.totalPhotos - top.totalPhotos) / top.totalPhotos) * 100;
          const absDiff = Math.abs(diff).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          insightTeam = {
            icon: <IconUsers />,
            variant: "warning" as any,
            text: `**${second.brand} tertinggal ${absDiff}% dari ${top.brand} dalam jumlah foto**`,
          };
        }

        let insightBrand = null;

        const doubleCount = outletRiskData?.doubleCoverage?.total ?? 0;
        const insightDouble = {
          icon: <IconRefresh />,
          variant: (doubleCount > 0 ? "danger" : "success") as any,
          text: doubleCount > 0 ? `**${doubleCount} outlet terjadi double visit (inefficient)**` : `**Tidak ada double visit bulan ini**`,
        };

        const items = [insightNotVisited, insightCoverage, insightTeam, insightDouble].filter(Boolean) as any[];
        return <KeyInsights title="KEY INSIGHTS" items={items} />;
      })()}

      {/* Performance Comparison */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 w-full">
        <p className="text-[11px] sm:text-[13px] font-bold tracking-widest uppercase text-gray-700 mb-4">
          PERFORMANCE COMPARISON
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
          <HorizBarChart
            title="JUMLAH FOTO BY POC"
            data={(performanceData?.channel ?? []).map((c) => ({ label: c.channel, value: c.totalPhotos }))}
            color="#3B82F6"
            loading={loadingPerformance}
          />
          <HorizBarChart
            title="JUMLAH FOTO PER SALES TYPE"
            data={(performanceData?.team ?? []).map((t) => ({ label: t.team, value: t.totalPhotos }))}
            color="#10B981"
            loading={loadingPerformance}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandDonutChart
              data={performanceData?.brand ?? []}
              total={performanceData?.brand?.reduce((s: number, b: any) => s + (b.totalPhotos ?? 0), 0) ?? 0}
              loading={loadingPerformance}
            />
          </div>
        </div>
      </div>

      {/* Salesman Tables + Outlet Risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {loadingSalesman ? (
          <>
            <TableSkeleton />
            <TableSkeleton />
            <OutletRiskOverview data={outletRiskData} loading={loadingOutletRisk} />
          </>
        ) : (
          <>
            <SalesmanRankTable
              title="TOP 5 SALESMAN PERFORMER"
              variant="top"
              data={(salesmanData?.top5 ?? []).map((s) => ({
                salesman: s.salesman,
                team: s.team,
                totalFoto: s.totalPhotos,
                outletCoverage: s.outletCoverage,
              }))}
              maxFoto={salesmanData?.top5?.[0]?.totalPhotos ?? 1200}
              linkLabel="Lihat semua salesman"
              onLinkClick={() => openLov("salesman-top", "Semua Top Salesman")}
            />
            <SalesmanRankTable
              title="BOTTOM 5 SALESMAN"
              variant="bottom"
              data={(salesmanData?.bottom5 ?? []).map((s) => ({
                salesman: s.salesman,
                team: s.team,
                totalFoto: s.totalPhotos,
                outletCoverage: s.outletCoverage,
              }))}
              maxFoto={salesmanData?.bottom5?.[0]?.totalPhotos ?? 300}
              linkLabel="Lihat semua salesman"
              onLinkClick={() => openLov("salesman-bottom", "Semua Bottom Salesman")}
            />
            <OutletRiskOverview
              data={outletRiskData}
              loading={loadingOutletRisk}
              onLihatSemua={(type) => {
                if (type === "belumDikunjungi") openLov("not-visited", "Outlet Belum Dikunjungi");
                if (type === "fotoRendah")      openLov("low-photo",   "Outlet Foto Rendah");
                if (type === "doubleCoverage")  openLov("double-coverage", "Outlet Double Coverage");
              }}
            />
          </>
        )}
      </div>

      {/* Trend Chart */}
      <TrendChart
        currentMonth={trendData?.current ?? []}
        prevMonth={trendData?.prev ?? []}
        summary={trendData?.summary}
        currentLabel={getMonthLabel(selectedMonth)}
        prevLabel={prevMonthLabel}
        loading={loadingTrend}
      />

      {/* LOV Modal */}
      <LovModal
        open={lovOpen}
        onClose={() => setLovOpen(false)}
        variant={lovVariant}
        title={lovTitle}
        onFetch={handleLovFetch}
      />

    </div>
  );
}