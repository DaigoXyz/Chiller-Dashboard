import { useEffect, useMemo, useState } from "react";
import { getDashboard, retryLogs } from "../api/DashboardApi";
import type { DashboardDto, ErrorLogItemDto } from "../types/Dashboard";
import { DeviceSyncDoughnut, PushGaugeLike, SyncSuccessStackedBar, OfflineDevicesLine } from "../components/Charts";
import LogoutButton from "../components/Logout";

function logKey(l: ErrorLogItemDto) {
  return `${l.time}|${l.level}|${l.message}`;
}
function badgeClassLevel(level: string) {
  if (level === "INFO") return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  if (level === "WARN") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border-rose-500/30";
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getDashboard();
        if (alive) setData(d);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const visibleLogs = useMemo(() => (data?.errorLogs ?? []).slice(0, 4), [data]);
  const allChecked = visibleLogs.length > 0 && visibleLogs.every((l) => selected.has(logKey(l)));

  const toggleAll = (checked: boolean) => {
    const next = new Set<string>();
    if (checked) visibleLogs.forEach((l) => next.add(logKey(l)));
    setSelected(next);
  };

  const toggleOne = (log: ErrorLogItemDto, checked: boolean) => {
    const k = logKey(log);
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(k);
      else next.delete(k);
      return next;
    });
  };

    const retryOne = async (log: ErrorLogItemDto) => {
        try {
            await retryLogs([logKey(log)]);
        } catch (e) {
            console.error(e);
        }
    };

    const retrySelected = async () => {
    const keys = visibleLogs.map(logKey).filter((k) => selected.has(k));
        try {
            await retryLogs(keys);
            setSelected(new Set());
        } catch (e) {
            console.error(e);
        }
    };


  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}

        {!loading && !data && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-amber-300 font-semibold">Failed to load dashboard</h4>
            <p className="mt-1 text-slate-400">API tidak mengembalikan data.</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                <p className="mt-1 text-sm text-slate-400">Real-time monitoring and analytics</p>
              </div>
              <LogoutButton />
            </div>

            {/* Metrics row */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Device Sync Status</div>
                <div className="mt-3 h-28">
                  <DeviceSyncDoughnut {...data.deviceSyncPie} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Push Success Rate</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-200">
                  {data.metrics.pushSuccessRate}%
                </div>
                <div className="mt-2 h-24">
                  <PushGaugeLike valuePercent={data.metrics.pushSuccessRate} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Active Offline Devices</div>
                <div className="mt-3 text-4xl font-semibold text-amber-200">
                  {data.metrics.activeOfflineDevices}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Order Price Anomalies</div>
                <div className="mt-3 text-4xl font-semibold text-rose-200">
                  {data.metrics.priceAnomalies}
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 font-medium">Sync Success Rate</div>
                <div className="h-64">
                  <SyncSuccessStackedBar {...data.syncSuccessSeries} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 font-medium">Offline Devices</div>
                <div className="h-64">
                  <OfflineDevicesLine {...data.offlineDevicesSeries} />
                </div>
              </div>
            </div>

            {/* Logs Preview */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Recent Error & Event Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-white/10">
                      <th className="w-12 py-2 text-left font-medium">
                        <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                      </th>
                      <th className="py-2 text-left font-medium">Time</th>
                      <th className="py-2 text-left font-medium">Level</th>
                      <th className="py-2 text-left font-medium">Message</th>
                      <th className="w-40 py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogs.map((log, idx) => {
                      const k = logKey(log);
                      return (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="py-2">
                            <input type="checkbox" checked={selected.has(k)} onChange={(e) => toggleOne(log, e.target.checked)} />
                          </td>
                          <td className="py-2">{log.time}</td>
                          <td className="py-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClassLevel(log.level)}`}>
                              {log.level}
                            </span>
                          </td>
                          <td className="py-2">{log.message}</td>
                          <td className="py-2">
                            <button
                              className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/25"
                              onClick={() => retryOne(log)}
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selected.size > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25"
                    onClick={retrySelected}
                  >
                    Retry Selected ({selected.size})
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}