import { useState } from "react"; // Tambahkan useState
import { Check, X, Loader2, Search } from "lucide-react"; // Tambahkan Search icon

export function CollectionTableList({ 
  items, 
  onRetry 
}: { 
  items: any[], 
  onRetry?: (item: any) => void 
}) {
  const [searchQuery, setSearchQuery] = useState(""); // State untuk pencarian

  // 1. Filter data berdasarkan input search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Sort data yang sudah difilter
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aStatus = a.failed > 0 ? 2 : (a.inProgress > 0 ? 1 : 0);
    const bStatus = b.failed > 0 ? 2 : (b.inProgress > 0 ? 1 : 0);
    if (aStatus !== bStatus) return bStatus - aStatus;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      
      {/* HEADER DENGAN SEARCH BAR */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-200 uppercase text-xs tracking-widest">
            Total Collection Firestore
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            {filteredItems.length} OF {items.length} ITEMS FOUND
          </p>
        </div>

        {/* Input Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          
          {/* TABLE HEADER */}
          <thead className="sticky top-0 bg-[#0f172a] z-20 text-slate-400">
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
              <th className="py-4 text-left font-semibold px-4 w-[180px]">
                Collection
              </th>
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
            {sortedItems.map((item, idx) => {

              const total = item.success + item.failed + item.inProgress;
              const rateNum = total > 0 ? (item.success / total) * 100 : 0;
              const pipelineStatus =
                item.failed > 0
                  ? "failed"
                  : item.inProgress > 0
                  ? "running"
                  : "success";

              return (
                <tr 
                  key={idx} 
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  {/* NAME */}
                  <td className="py-4 px-4 font-mono text-sm text-slate-300 group-hover:text-white truncate max-w-[180px]">
                    {item.name}
                  </td>

                  {/* NUMBERS */}
                  <td className="py-4 text-center font-mono text-base text-slate-300">
                    {total}
                  </td>

                  <td className="py-4 text-center font-mono text-base text-emerald-400">
                    {item.success}
                  </td>

                  <td className={`py-4 text-center font-mono text-base ${
                    item.failed > 0 
                      ? 'text-rose-500 font-semibold' 
                      : 'text-slate-600'
                  }`}>
                    {item.failed}
                  </td>

                  <td className={`py-4 text-center font-mono text-base ${
                    item.inProgress > 0 
                      ? 'text-amber-400' 
                      : 'text-slate-600'
                  }`}>
                    {item.inProgress}
                  </td>

                  {/* PIPELINE */}
                  <td className="py-4">
                    <div className="flex items-center justify-center">
                      {[1,2,3].map((step) => {

                        const isSuccess = pipelineStatus === "success";
                        const isFailed = pipelineStatus === "failed";
                        const isRunning = pipelineStatus === "running";

                        const isDone = isSuccess;
                        const isActive = isRunning && step === 1;
                        const isError = isFailed && step === 1;
                        const isPending = !isDone && !isActive && !isError;

                        return (
                          <div key={step} className="flex items-center">
                            <div
                              className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border
                                ${isDone ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : ""}
                                ${isError ? "border-rose-500 bg-rose-500/20 text-rose-400" : ""}
                                ${isActive ? "border-blue-500 bg-blue-500/20 text-blue-400" : ""}
                                ${isPending ? "border-white/10 bg-white/5 text-slate-600" : ""}
                              `}
                            >
                              {isDone && <Check className="h-3 w-3" />}
                              {isError && <X className="h-3 w-3" />}
                              {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                              {isPending && (
                                <div className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />
                              )}
                            </div>

                            {step < 3 && (
                              <div
                                className={`h-[2px] w-10 ${
                                  isDone ? "bg-emerald-500/40" : "bg-white/10"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* SUCCESS RATE */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            rateNum >= 100
                              ? "bg-emerald-500"
                              : rateNum > 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${rateNum}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm text-slate-300 w-10 text-right">
                        {Math.round(rateNum)}%
                      </span>
                    </div>
                  </td>

                  {/* ACTION */}
                    <td className="py-5 px-2 w-[150px] text-right">
                        <button
                            onClick={() => onRetry?.(item)}
                            className={`border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 shadow-lg shadow-rose-500/5`}
                        >
                            <span>Retry</span>
                        </button>
                    </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={8} className="py-10 text-center text-slate-500 text-sm italic">
                No collections found matching "{searchQuery}"
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}