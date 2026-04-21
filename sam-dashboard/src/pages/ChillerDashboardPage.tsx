import { useEffect, useState, useRef } from "react";
import { getChillerDaily } from "../api/ChillerApi";
import type { ChillerDaily } from "../api/ChillerApi";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

const CHART_PALETTES = {
  photos:  ["#22d3ee"],
  stores:  ["#4ade80"],
  channel: ["#f472b6","#fb923c","#facc15","#a78bfa","#34d399","#f87171","#38bdf8","#e879f9","#86efac","#c084fc","#ff6b6b","#ffd93d"],
  display: ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff922b","#cc5de8","#20c997"],
  team: ["#f9c74f","#f8961e","#f3722c","#e63946","#d1ffb4","#338642","#68c5ed","#0a7ebc","#9a93e1"],
};

function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─── Date Range Picker ────────────────────────────────────────────────────────
function DateRangePicker({ start, end, onChange }: {
  start: string; end: string;
  onChange: (s: string, e: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(() => parseInt(start.split("-")[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(start.split("-")[1]) - 1);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDisplay = (s: string, e: string) => {
    const fmt = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
    return `${fmt(s)}  →  ${fmt(e)}`;
  };

  function calDays(year: number, month: number) {
    const first = new Date(year, month, 1).getDay();
    const days: (string | null)[] = Array(first).fill(null);
    const total = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return days;
  }

  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2  = viewMonth === 11 ? viewYear + 1 : viewYear;
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const handleDayClick = (d: string) => {
    if (!selecting) { setSelecting(d); } else {
      let s = selecting < d ? selecting : d;
      let e = selecting < d ? d : selecting;
      if (diffDays(s, e) > 14) e = addDays(s, 14);
      onChange(s, e); setSelecting(null); setOpen(false);
    }
  };

  const isInRange = (d: string) => {
    if (selecting) {
      const lo = selecting < (hoverDate ?? selecting) ? selecting : (hoverDate ?? selecting);
      const hi = selecting < (hoverDate ?? selecting) ? (hoverDate ?? selecting) : selecting;
      return d > lo && d < hi;
    }
    return d > start && d < end;
  };
  const isStart = (d: string) => selecting ? d === selecting : d === start;
  const isEnd   = (d: string) => !selecting && d === end;

  const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const DAYS   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  function CalMonth({ year, month }: { year: number; month: number }) {
    const days = calDays(year, month);
    return (
      <div className="flex-1">
        <div className="text-center text-sm font-semibold text-slate-200 mb-3">{MONTHS[month]} {year}</div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-[10px] text-slate-500 font-medium py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d, i) => {
            if (!d) return <div key={i} />;
            const _isStart = isStart(d), _isEnd = isEnd(d), _inRange = isInRange(d);
            const _today = d === new Date().toISOString().split("T")[0];
            const tooFar = selecting ? diffDays(selecting < d ? selecting : d, selecting < d ? d : selecting) > 14 : false;
            return (
              <div key={d} onClick={() => !tooFar && handleDayClick(d)}
                onMouseEnter={() => setHoverDate(d)} onMouseLeave={() => setHoverDate(null)}
                className={`text-center text-xs py-1.5 rounded-md cursor-pointer select-none transition-colors
                  ${_isStart || _isEnd ? "bg-emerald-500 text-white font-bold"
                    : _inRange ? "bg-emerald-500/20 text-emerald-300"
                    : tooFar ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-300 hover:bg-white/10"}
                  ${_today && !_isStart && !_isEnd ? "ring-1 ring-slate-500" : ""}`}
              >
                {d.split("-")[2]}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — solid slate-700, teks putih, selalu keliatan */}
      <button
        onClick={() => { setOpen(o => !o); setSelecting(null); }}
        className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-white transition cursor-pointer"
        style={{ background: "#334155", border: "1px solid #475569" }}
      >
        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-mono">{formatDisplay(start, end)}</span>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl p-4 w-[560px]">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-xs text-slate-500">
              {selecting ? <span className="text-emerald-400">Pilih tanggal akhir (maks. 15 hari)</span> : <span>Pilih tanggal mulai</span>}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex gap-6">
            <CalMonth year={viewYear} month={viewMonth} />
            <div className="w-px bg-white/10" />
            <CalMonth year={year2} month={month2} />
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
            <span>Rentang terpilih: <span className="text-slate-300 font-mono">{diffDays(start, end) + 1} hari</span></span>
            <span>Maksimal 15 hari</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple bar chart ─────────────────────────────────────────────────────────
function SimpleBarChart({ days, data, color, label, isDark }: {
  days: string[]; data: Record<string, number>; color: string; label: string; isDark: boolean;
}) {
  const max = Math.max(...days.map((d) => data[d] ?? 0), 1);
  const [tooltip, setTooltip] = useState<{ x: number; d: string; v: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div ref={ref} className="flex items-end gap-1 px-1" style={{ height: 160 }}>
        {days.map((d) => {
          const v = data[d] ?? 0;
          const h = Math.max((v / max) * 160, v > 0 ? 2 : 0);
          return (
            <div key={d} className="flex-1 flex flex-col justify-end items-center cursor-default" style={{ height: 160 }}
              onMouseEnter={(e) => {
                const rect = ref.current!.getBoundingClientRect();
                const br = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ x: br.left - rect.left + br.width / 2, d, v });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {v > 0 && (
                <span className={`text-[14px] font-semibold mb-0.5 leading-none ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                </span>
              )}
              <div className="w-full rounded-t-sm transition-all"
                style={{ height: h, background: color, opacity: v === 0 ? 0.15 : 0.9 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 px-1 mt-1">
        {days.map((d, i) => (
          <div key={d} className="flex-1 text-center" style={{ minWidth: 0 }}>
            {(days.length <= 15 || i % Math.ceil(days.length / 10) === 0) && (
              <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{shortDate(d)}</span>
            )}
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="absolute z-20 bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs pointer-events-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: tooltip.x, top: 4 }}>
          <span className="text-slate-400">{tooltip.d}</span><br />
          <span className="font-semibold" style={{ color }}>{tooltip.v.toLocaleString()} {label}</span>
        </div>
      )}
    </div>
  );
}

// ─── Stacked bar chart ────────────────────────────────────────────────────────
function StackedBarChart({ days, series, valueLabel, isDark }: {
  days: string[];
  series: { key: string; label: string; color: string; data: Record<string, number> }[];
  valueLabel: string;
  isDark: boolean;
}) {
  const totals = days.map((d) => series.reduce((s, sr) => s + (sr.data[d] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const [tooltip, setTooltip] = useState<{ x: number; d: string; vals: { label: string; color: string; v: number }[] } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div ref={ref} className="flex items-end gap-1 px-1" style={{ height: 160 }}>
        {days.map((d, di) => {
          const total = totals[di];
          const h = Math.max((total / max) * 160, total > 0 ? 2 : 0);
          return (
            <div key={d} className="flex-1 flex flex-col justify-end items-center cursor-default" style={{ height: 160 }}
              onMouseEnter={(e) => {
                const rect = ref.current!.getBoundingClientRect();
                const br = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ x: br.left - rect.left + br.width / 2, d,
                  vals: series.map((sr) => ({ label: sr.label, color: sr.color, v: sr.data[d] ?? 0 })) });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {total > 0 && (
                <span className={`text-[14px] font-semibold mb-0.5 leading-none ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                </span>
              )}
              <div className="w-full rounded-t-sm overflow-hidden flex flex-col justify-end" style={{ height: h }}>
                {series.map((sr) => {
                  const v = sr.data[d] ?? 0;
                  const segH = total > 0 ? (v / total) * h : 0;
                  return <div key={sr.key} style={{ height: segH, background: sr.color, opacity: 0.9, flexShrink: 0 }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 px-1 mt-1">
        {days.map((d, i) => (
          <div key={d} className="flex-1 text-center" style={{ minWidth: 0 }}>
            {(days.length <= 15 || i % Math.ceil(days.length / 10) === 0) && (
              <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{shortDate(d)}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {series.map((sr) => (
          <div key={sr.key} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 inline-block" style={{ background: sr.color, opacity: 0.9 }} />
            <span className={isDark ? "text-slate-400" : "text-slate-600"}>{sr.label}</span>
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="absolute z-20 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs pointer-events-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: tooltip.x, top: 4 }}>
          <div className="text-slate-400 mb-1">{tooltip.d}</div>
          {tooltip.vals.filter(v => v.v > 0).map((v) => (
            <div key={v.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ background: v.color }} />
              <span style={{ color: v.color }}>{v.label}</span>
              <span className="text-slate-200 ml-auto pl-3 font-semibold">{v.v.toLocaleString()} {valueLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
function ChartCard({ title, total, totalLabel, children, onExport, isDark }: {
  title: string; total?: number; totalLabel?: string;
  children: React.ReactNode; onExport?: () => void; isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-colors duration-300 ${
      isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white shadow-sm"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`text-xs font-semibold uppercase tracking-widest pt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {title}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {total !== undefined && (
            <div className="text-right">
              <div className={`text-2xl font-bold font-mono leading-none ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                {total.toLocaleString()}
              </div>
              <div className={`text-[12px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{totalLabel}</div>
            </div>
          )}
          {onExport && (
            <button
              onClick={onExport}
              title="Export ke Excel"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#6ee7b7")}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b")}
              style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.1)",
                width: "32px", height: "32px", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                color: isDark ? "#94a3b8" : "#64748b",
                transition: "color 0.15s",
              }}
            >
              <Download style={{ width: "15px", height: "15px", minWidth: "15px", flexShrink: 0 }} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChillerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<ChillerDaily | null>(null);
  const [applied, setApplied] = useState({ start: "2026-04-01", end: "2026-04-15" });
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") ?? "light"
  );
  const isDark = theme === "dark";

  useEffect(() => {
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new Event("themechange"));
  }, [theme]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getChillerDaily(applied.start, applied.end)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.response?.data?.error ?? e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [applied]);

  const days = dateRange(applied.start, applied.end);

  const photosMap: Record<string, number> = {};
  data?.photosPerDay.forEach((r) => { photosMap[r.tgl] = r.totalPhotos; });
  const totalPhotos = Object.values(photosMap).reduce((s, v) => s + v, 0);

  const storesMap: Record<string, number> = {};
  data?.storesPerDay.forEach((r) => { storesMap[r.tgl] = r.totalStores; });
  const totalStores = Object.values(storesMap).reduce((s, v) => s + v, 0);

  const channelKeys = [...new Set(data?.channelPerDay.map((r) => r.channel) ?? [])].sort();
  const channelSeries = channelKeys.map((ch, i) => {
    const dayMap: Record<string, number> = {};
    data?.channelPerDay.filter((r) => r.channel === ch).forEach((r) => { dayMap[r.tgl] = r.totalStores; });
    return { key: ch, label: ch, color: CHART_PALETTES.channel[i % CHART_PALETTES.channel.length], data: dayMap };
  });

  const poiKeys = [...new Set(data?.displayPerDay.map((r) => r.poi) ?? [])].sort();
  const displaySeries = poiKeys.map((poi, i) => {
    const dayMap: Record<string, number> = {};
    data?.displayPerDay.filter((r) => r.poi === poi).forEach((r) => { dayMap[r.tgl] = r.totalPhotos; });
    return { key: poi, label: poi, color: CHART_PALETTES.display[i % CHART_PALETTES.display.length], data: dayMap };
  });
  const totalDisplayPhotos = data?.displayPerDay.reduce((s, r) => s + r.totalPhotos, 0) ?? 0;

  const teamKeys = [...new Set(data?.teamPerDay.map((r) => r.team) ?? [])].sort();
  const teamSeries = teamKeys.map((team, i) => {
    const dayMap: Record<string, number> = {};
    data?.teamPerDay.filter((r) => r.team === team).forEach((r) => { dayMap[r.tgl] = r.totalStores; });
    return { key: team, label: team, color: CHART_PALETTES.team[i % CHART_PALETTES.team.length], data: dayMap };
  });
  const totalTeamStores = data?.teamPerDay.reduce((s, r) => s + r.totalStores, 0) ?? 0;

  function exportPhotos() { exportToExcel("jumlah_foto_per_hari", "Foto", days.map((d) => ({ Tanggal: d, "Jumlah Foto": photosMap[d] ?? 0 }))); }
  function exportStores() { exportToExcel("jumlah_toko_per_hari", "Toko", days.map((d) => ({ Tanggal: d, "Jumlah Toko": storesMap[d] ?? 0 }))); }
  function exportChannel() { exportToExcel("toko_per_channel_per_hari", "Channel", days.flatMap((d) => channelSeries.map((sr) => ({ Tanggal: d, Channel: sr.label, "Jumlah Toko": sr.data[d] ?? 0 })))); }
  function exportDisplay() { exportToExcel("jenis_display_per_hari", "Display", days.flatMap((d) => displaySeries.map((sr) => ({ Tanggal: d, "Tipe Display (POI)": sr.label, "Jumlah Foto": sr.data[d] ?? 0 })))); }
  function exportTeam() { exportToExcel("team_sales_per_hari", "Team Sales", days.flatMap((d) => teamSeries.map((sr) => ({ Tanggal: d, Team: sr.label, "Jumlah Toko": sr.data[d] ?? 0 })))); }

  return (
    <div className={`p-6 min-h-screen transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div className="flex justify-end items-center gap-3">
          <DateRangePicker
            start={applied.start} end={applied.end}
            onChange={(s, e) => setApplied({ start: s, end: e })}
          />
          {/* Theme toggle — solid, teks putih, selalu keliatan */}
          <button
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200"
            style={{ background: "#334155", border: "1px solid #475569" }}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className={`h-10 w-10 animate-spin rounded-full border-2 border-t-emerald-400 ${
              isDark ? "border-slate-700" : "border-slate-300"
            }`} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
            <h4 className="text-rose-400 font-semibold mb-1">Gagal memuat data</h4>
            <p className={`text-sm font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>{error}</p>
          </div>
        )}

        {/* Charts */}
        {!loading && !error && data && (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <ChartCard title="Jumlah Foto per Hari" total={totalPhotos} totalLabel="Total foto periode ini" onExport={exportPhotos} isDark={isDark}>
                <SimpleBarChart days={days} data={photosMap} color="#22d3ee" label="foto" isDark={isDark} />
              </ChartCard>
              <ChartCard title="Jumlah Toko per Hari" total={totalStores} totalLabel="Total kunjungan toko" onExport={exportStores} isDark={isDark}>
                <SimpleBarChart days={days} data={storesMap} color="#4ade80" label="toko" isDark={isDark} />
              </ChartCard>
              <ChartCard title="Toko per Channel per Hari" total={totalStores} totalLabel="Total toko semua channel" onExport={exportChannel} isDark={isDark}>
                {channelSeries.length > 0
                  ? <StackedBarChart days={days} series={channelSeries} valueLabel="toko" isDark={isDark} />
                  : <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Tidak ada data channel.</p>}
              </ChartCard>
              <ChartCard title="Jenis Display per Hari" total={totalDisplayPhotos} totalLabel="Total foto display periode ini" onExport={exportDisplay} isDark={isDark}>
                {displaySeries.length > 0
                  ? <StackedBarChart days={days} series={displaySeries} valueLabel="foto" isDark={isDark} />
                  : <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Tidak ada data display.</p>}
              </ChartCard>
            </div>
            <ChartCard title="Team Sales per Hari" total={totalTeamStores} totalLabel="Total kunjungan toko semua team" onExport={exportTeam} isDark={isDark}>
              {teamSeries.length > 0
                ? <StackedBarChart days={days} series={teamSeries} valueLabel="toko" isDark={isDark} />
                : <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Tidak ada data team.</p>}
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}