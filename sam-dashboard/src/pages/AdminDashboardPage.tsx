import { useEffect, useMemo, useState } from "react";
import { getDashboard, retryLogs } from "../api/DashboardApi";
import type { DashboardDto, ErrorLogItemDto } from "../types/Dashboard";
import { DeviceSyncDoughnut, PushGaugeLike, SyncSuccessStackedBar, OfflineDevicesLine, ThroughputGauge, OfflineDevicesPie, } from "../components/Charts";
import { CollectionTableList, ErrorLogTableList } from "../components/Table";
import Navbar from "../components/Navbar";

function logKey(l: ErrorLogItemDto) {
  return `${l.time}|${l.level}|${l.message}`;
} 
// Temporary function to add pipeline status for testing
type PipelineStatus = "success" | "failed" | "running" | "warning";

// function pipelineMeta(status?: PipelineStatus) {
//   switch (status) {
//     case "success":
//       return { label: "Success", cls: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" };
//     case "failed":
//       return { label: "Failed", cls: "bg-rose-500/15 text-rose-200 border-rose-500/30" };
//     case "running":
//       return { label: "Running", cls: "bg-blue-500/15 text-blue-200 border-blue-500/30" };
//     case "warning":
//       return { label: "Warning", cls: "bg-amber-500/15 text-amber-200 border-amber-500/30" };
//     default:
//       return { label: "-", cls: "bg-white/5 text-slate-400 border-white/10" };
//   }
// }
function addPipelineStatus(logs: ErrorLogItemDto[]): (ErrorLogItemDto & { pipelineStatus: PipelineStatus })[] {
  const statuses: PipelineStatus[] = ["failed", "warning", "running", "success"];
  return logs.map((log, idx) => ({
    ...log,
    pipelineStatus: statuses[idx % statuses.length],
  }));
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dummyCollections = useMemo(() => {
  const collections = [
    "route", "salesman", "store", "survey", "survey_item", "visit_config_customer", "order", "inventory", 
    "customer", "promotion", "asset", "competitor", "tracking", "attendance", "expense"
  ];
  
  return Array.from({ length: 71 }).map((_, i) => {
    const name = collections[i % collections.length] + `_${i}`;
    // Bikin beberapa data random gagal biar heatmapnya berwarna
    const failed = Math.random() > 0.9 ? Math.floor(Math.random() * 5) : 0;
    const inProgress = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
    
    return {
      name,
      success: Math.floor(Math.random() * 100),
      failed,
      inProgress
    };
  });
}, []);

  // Initialize with last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  
  const [dateRange, setDateRange] = useState({
    start: weekAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // TODO: Pass dateRange to API when backend supports it
        const d = await getDashboard();
        // Add pipeline status to logs for testing
        if (d && d.errorLogs) {
          d.errorLogs = addPipelineStatus(d.errorLogs);
        }
        if (alive) setData(d);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [dateRange]); // Re-fetch when date range changes

  const visibleLogs = useMemo(() => (data?.errorLogs ?? []).slice(0, 4), [data]);

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
            {/* Navbar with Filter */}
            <Navbar selectedDateRange={dateRange} onDateRangeChange={setDateRange} />

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
                <div className="text-sm text-slate-400">Total Collection Firestore</div>
                <div className="mt-3 h-28">
                  <OfflineDevicesPie {...data.offlineDevicesPie} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Total Average Throughput Push Data</div>
                <div className="mt-3 h-32">
                  <ThroughputGauge value={data.metrics.priceAnomalies} max={10} />
                </div>
              </div>
            </div>

            {/* Charts row */}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 font-medium">Push Rate</div>
                <div className="h-64">
                  <SyncSuccessStackedBar {...data.syncSuccessSeries} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 font-medium">Pull Data</div>
                <div className="h-64">
                  <OfflineDevicesLine {...data.offlineDevicesSeries} />
                </div>
              </div>
            </div>
            
            <CollectionTableList 
              items={dummyCollections} 
              onRetry={(item) => console.log("Retrying", item.name)} 
            />

            <ErrorLogTableList 
              logs={visibleLogs}
              selected={selected}
              onToggleAll={toggleAll}
              onToggleOne={toggleOne}
              onRetryOne={retryOne}
              onRetrySelected={retrySelected}
            />
          </>
        )}
      </div>
    </div>
  );
}