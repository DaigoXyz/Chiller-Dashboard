import { useEffect, useState, useMemo } from "react";
import { getErrorLogs } from "../api/LogsApi";
import type { ErrorLogItemDto } from "../types/Dashboard";

function logKey(l: ErrorLogItemDto) {
  return `${l.time}|${l.level}|${l.message}`;
}

function badgeClassLevel(level: string) {
  if (level === "INFO") return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  if (level === "WARN") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border-rose-500/30";
}

export default function ErrorLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLogItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const levelMap: Record<string, "INFO" | "WARN" | "ERROR"> = {
    LOW: "INFO",
    MEDIUM: "WARN",
    HIGH: "ERROR",
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getErrorLogs();
        if (alive) setLogs(data);
      } catch (err) {
        console.error(err);
        if (alive) setLogs([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by level
    if (levelFilter !== "ALL") {
      const mappedLevel = levelMap[levelFilter];
      result = result.filter((log) => log.level === mappedLevel);
    }

    // Search by message or time
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.time.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, levelFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, levelFilter]);

  const levelCounts = useMemo(() => {
    const counts = { ALL: logs.length, INFO: 0, WARN: 0, ERROR: 0 };
    logs.forEach((log) => {
      if (log.level in counts) {
        counts[log.level as keyof typeof counts]++;
      }
    });
    return counts;
  }, [logs]);

  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Error & Event Logs</h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor and analyze system logs
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Total Logs</div>
                <div className="mt-2 text-3xl font-semibold">{levelCounts.ALL}</div>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="text-sm text-sky-300">Info</div>
                <div className="mt-2 text-3xl font-semibold text-sky-200">{levelCounts.INFO}</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-sm text-amber-300">Warnings</div>
                <div className="mt-2 text-3xl font-semibold text-amber-200">{levelCounts.WARN}</div>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="text-sm text-rose-300">Errors</div>
                <div className="mt-2 text-3xl font-semibold text-rose-200">{levelCounts.ERROR}</div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Search */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by message or time..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {/* Level Filter */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Filter by Level
                  </label>
                  <div className="flex gap-2">
                    {["ALL", "LOW", "MEDIUM", "HIGH"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setLevelFilter(level)}
                        className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                          levelFilter === level
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-200"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-4 text-sm text-slate-400">
                Showing {paginatedLogs.length} of {filteredLogs.length} logs
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-white/10">
                      <th className="py-3 text-left font-medium">Time</th>
                      <th className="py-3 text-left font-medium">Level</th>
                      <th className="py-3 text-left font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-400">
                          No logs found
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={logKey(log)} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-3 font-mono text-xs">{log.time}</td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClassLevel(
                                log.level
                              )}`}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td className="py-3">{log.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}