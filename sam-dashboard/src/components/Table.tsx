import { useState } from "react";
import { Check, X, Loader2, Search, AlertTriangle } from "lucide-react";
import type { ErrorLogItemDto } from "../types/Dashboard";

function badgeClassLevel(level: string) {
  if (level === "INFO") return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  if (level === "WARN") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border-rose-500/30";
}

const getLogKey = (l: ErrorLogItemDto) => `${l.time}|${l.level}|${l.message}`;

//Table Collection (Table Pertama)
export function CollectionTableList({ items, onRetry }: { items: any[], onRetry?: (item: any) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = items.filter((item) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-200 uppercase text-xs tracking-widest">Total Collection Firestore</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-1">{filteredItems.length} OF {items.length} ITEMS FOUND</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text" placeholder="Search collection..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-[#0f172a] z-20 text-slate-400">
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
              <th className="py-4 text-left font-semibold px-4 w-[180px]">Collection</th>
              <th className="py-4 text-center font-semibold">Records</th>
              <th className="py-4 text-center font-semibold text-emerald-400">Success</th>
              <th className="py-4 text-center font-semibold text-rose-400">Failed</th>
              <th className="py-4 text-center font-semibold text-amber-400">In-Progress</th>
              <th className="py-4 text-center font-semibold w-[120px]">Pipeline</th>
              <th className="py-4 text-center font-semibold px-4 w-[160px]">Success Rate</th>
              <th className="py-4 text-right font-semibold px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedItems.length > 0 ? (
              sortedItems.map((item, idx) => {
                const total = item.success + item.failed + item.inProgress;
                const rateNum = total > 0 ? (item.success / total) * 100 : 0;
                const pipelineStatus = item.failed > 0 ? "failed" : item.inProgress > 0 ? "running" : "success";
                return (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-4 px-4 font-mono text-sm text-slate-300 group-hover:text-white truncate max-w-[180px]">{item.name}</td>
                    <td className="py-4 text-center font-mono text-base text-slate-300">{total}</td>
                    <td className="py-4 text-center font-mono text-base text-emerald-400">{item.success}</td>
                    <td className={`py-4 text-center font-mono text-base ${item.failed > 0 ? 'text-rose-500 font-semibold' : 'text-slate-600'}`}>{item.failed}</td>
                    <td className={`py-4 text-center font-mono text-base ${item.inProgress > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{item.inProgress}</td>
                    <td className="py-4">
                      <div className="flex items-center justify-center">
                        {[1, 2, 3].map((step) => (
                          <div key={step} className="flex items-center">
                            <div className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border 
                              ${pipelineStatus === "success" ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : 
                                (pipelineStatus === "failed" && step === 1) ? "border-rose-500 bg-rose-500/20 text-rose-400" :
                                (pipelineStatus === "running" && step === 1) ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-white/10 bg-white/5 text-slate-600"}`}>
                              {pipelineStatus === "success" ? <Check className="h-3 w-3" /> : (pipelineStatus === "failed" && step === 1) ? <X className="h-3 w-3" /> : (pipelineStatus === "running" && step === 1) ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />}
                            </div>
                            {step < 3 && <div className={`h-[2px] w-10 ${pipelineStatus === "success" ? "bg-emerald-500/40" : "bg-white/10"}`} />}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <div className={`h-full transition-all duration-700 ${rateNum >= 100 ? "bg-emerald-500" : rateNum > 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${rateNum}%` }} />
                        </div>
                        <span className="font-mono text-sm text-slate-300 w-10 text-right">{Math.round(rateNum)}%</span>
                      </div>
                    </td>
                    <td className="py-5 px-2 text-right">
                      <button onClick={() => onRetry?.(item)} className="border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 px-3 py-1 rounded text-xs transition-all">Retry</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500 text-sm italic border-b border-white/5">
                  No collections found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//Table Error & Event logs (Table Kedua)
export function ErrorLogTableList({ 
  logs, selected, onToggleAll, onToggleOne, onRetryOne, onRetrySelected 
}: { 
  logs: any[], 
  selected: Set<string>, 
  onToggleAll: (checked: boolean) => void, 
  onToggleOne: (log: any, checked: boolean) => void, 
  onRetryOne: (log: any) => void, 
  onRetrySelected: () => void 
}) {
  const allChecked = logs.length > 0 && logs.every((l) => selected.has(getLogKey(l)));

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-slate-200">Recent Error & Event Logs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-white/10">
              <th className="w-12 py-2 text-left font-medium">
                <input type="checkbox" checked={allChecked} onChange={(e) => onToggleAll(e.target.checked)} />
              </th>
              <th className="py-2 text-left font-medium">Time</th>
              <th className="py-2 text-left font-medium">Level</th>
              <th className="py-2 text-left font-medium">Message</th>
              <th className="w-[280px] px-2 py-2 text-center font-medium">Pipeline</th>
              <th className="w-32 px-2 py-2 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const k = getLogKey(log);
              return (
                <tr key={idx} className="border-b border-white/5">
                  <td className="py-2">
                    <input type="checkbox" checked={selected.has(k)} onChange={(e) => onToggleOne(log, e.target.checked)} />
                  </td>
                  <td className="py-2 text-slate-300">{log.time}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClassLevel(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="w-[350px] py-2 break-words text-slate-300">{log.message}</td>
                  <td className="w-[350px] py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Build Stage */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          log.pipelineStatus === "success" ? "border-emerald-500/30 bg-emerald-500/15" :
                          log.pipelineStatus === "failed" ? "border-rose-500/30 bg-rose-500/15" :
                          log.pipelineStatus === "running" ? "border-blue-500/30 bg-blue-500/15" :
                          "border-amber-500/30 bg-amber-500/15"
                        }`}>
                          {log.pipelineStatus === "failed" ? <X className="h-4 w-4 text-rose-200" /> :
                           log.pipelineStatus === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-200" /> :
                           log.pipelineStatus === "running" ? <Loader2 className="h-4 w-4 animate-spin text-blue-200" /> :
                           <Check className="h-4 w-4 text-emerald-200" />}
                        </div>
                      </div>
                      <div className="h-0.5 w-8 bg-white/10"></div>
                      {/* Test Stage 1 */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          log.pipelineStatus === "success" ? "border-emerald-500/30 bg-emerald-500/15" :
                          log.pipelineStatus === "running" ? "border-blue-500/30 bg-blue-500/15" : "border-white/10 bg-white/5"
                        }`}>
                          {log.pipelineStatus === "success" ? <Check className="h-4 w-4 text-emerald-200" /> :
                           log.pipelineStatus === "running" ? <Loader2 className="h-4 w-4 animate-spin text-blue-200" /> :
                           <div className="h-2 w-2 rounded-full bg-white/20"></div>}
                        </div>
                      </div>
                      <div className="h-0.5 w-8 bg-white/10"></div>
                      {/* Test Stage 2 */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          log.pipelineStatus === "success" ? "border-emerald-500/30 bg-emerald-500/15" : "border-white/10 bg-white/5"
                        }`}>
                          {log.pipelineStatus === "success" ? <Check className="h-4 w-4 text-emerald-200" /> :
                           <div className="h-2 w-2 rounded-full bg-white/20"></div>}
                        </div>
                      </div>
                      <div className="h-0.5 w-8 bg-white/10"></div>
                      {/* Deploy Stage */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          log.pipelineStatus === "success" ? "border-emerald-500/30 bg-emerald-500/15" : "border-white/10 bg-white/5"
                        }`}>
                          {log.pipelineStatus === "success" ? <Check className="h-4 w-4 text-emerald-200" /> :
                           <div className="h-2 w-2 rounded-full bg-white/20"></div>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    <button
                      className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/25"
                      onClick={() => onRetryOne(log)}
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
            onClick={onRetrySelected}
          >
            Retry Selected ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}