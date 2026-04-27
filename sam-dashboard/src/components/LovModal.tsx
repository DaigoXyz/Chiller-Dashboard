import React, { useEffect, useRef, useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="15 18 9 12 15 6" />
  </svg>
);
const IconChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <polyline strokeLinecap="round" strokeLinejoin="round" points="9 18 15 12 9 6" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type LovModalVariant =
  | "salesman-top"
  | "salesman-bottom"
  | "not-visited"
  | "low-photo"
  | "double-coverage";

export interface SalesmanRow {
  salesman: string;
  team: string;
  totalPhotos: number;
  visitedOutlets: number;
  totalAssignedOutlets: number;
  outletCoverage: number;
}

export interface OutletRow {
  customerId: string;
  customerName: string;
  totalPhotos?: number;       // low-photo
  salesmanCount?: number;     // double-coverage
}

export type LovModalRow = SalesmanRow | OutletRow;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRows: number;
  totalPages: number;
}

export interface LovModalProps {
  open: boolean;
  onClose: () => void;
  variant: LovModalVariant;
  /** Callback to fetch data. Called on open, page change, and search (debounced). */
  onFetch: (params: {
    page: number;
    limit: number;
    search: string;
  }) => Promise<{ data: LovModalRow[]; pagination: PaginationMeta }>;
  title?: string;
  /** Page limit per fetch */
  limit?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIMIT = 20;

function isSalesmanRow(row: LovModalRow): row is SalesmanRow {
  return "salesman" in row;
}

function isOutletRow(row: LovModalRow): row is OutletRow {
  return "customerId" in row;
}

const fmt = (n: number) => n.toLocaleString("id-ID");

// ─── Column Definitions ───────────────────────────────────────────────────────

function SalesmanTableHead({ variant }: { variant: "salesman-top" | "salesman-bottom" }) {
  const accentClass = variant === "salesman-top" ? "text-blue-600" : "text-red-500";
  return (
    <thead>
      <tr className="text-[10px] sm:text-[11px] text-gray-400 font-semibold border-b border-gray-100">
        <th className="text-left py-2 pl-3 w-8">#</th>
        <th className="text-left py-2 pl-1">Salesman</th>
        <th className="text-left py-2 hidden sm:table-cell">Team</th>
        <th className={`text-right py-2 ${accentClass}`}>Total Foto</th>
        <th className="text-right py-2 pr-3 hidden sm:table-cell text-gray-400">Visited</th>
        <th className="text-right py-2 pr-3">Coverage</th>
      </tr>
    </thead>
  );
}

function SalesmanTableRow({
  row,
  index,
  variant,
}: {
  row: SalesmanRow;
  index: number;
  variant: "salesman-top" | "salesman-bottom";
}) {
  const barColor = variant === "salesman-top" ? "bg-blue-500" : "bg-red-400";
  const pctColor = variant === "salesman-top" ? "text-blue-600" : "text-red-500";
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
      <td className="py-2 pl-3 text-[11px] text-gray-400 font-medium align-middle">{index}</td>
      <td className="py-2 pl-1 align-middle">
        <span className="text-[11px] sm:text-[12px] text-gray-700 font-medium truncate block max-w-[120px] sm:max-w-[200px]" title={row.salesman}>
          {row.salesman}
        </span>
      </td>
      <td className="py-2 align-middle hidden sm:table-cell">
        <span className="text-[11px] text-gray-500 truncate block max-w-[120px]" title={row.team}>{row.team}</span>
      </td>
      <td className="py-2 text-right align-middle">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] sm:text-[12px] text-gray-700 leading-none">{fmt(row.totalPhotos)}</span>
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(row.outletCoverage, 100)}%` }} />
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-right text-[11px] text-gray-400 align-middle hidden sm:table-cell">
        {row.visitedOutlets}/{row.totalAssignedOutlets}
      </td>
      <td className={`py-2 pr-3 text-right text-[11px] sm:text-[12px] font-bold align-middle ${pctColor}`}>
        {row.outletCoverage}%
      </td>
    </tr>
  );
}

function OutletTableHead({ variant }: { variant: "not-visited" | "low-photo" | "double-coverage" }) {
  return (
    <thead>
      <tr className="text-[10px] sm:text-[11px] text-gray-400 font-semibold border-b border-gray-100">
        <th className="text-left py-2 pl-3 w-8">#</th>
        <th className="text-left py-2 pl-1">ID Outlet</th>
        <th className="text-left py-2">Nama Outlet</th>
        {variant === "low-photo" && (
          <th className="text-right py-2 pr-3 text-yellow-500">Foto</th>
        )}
        {variant === "double-coverage" && (
          <th className="text-right py-2 pr-3 text-blue-500">Salesman</th>
        )}
      </tr>
    </thead>
  );
}

function OutletTableRow({
  row,
  index,
  variant,
}: {
  row: OutletRow;
  index: number;
  variant: "not-visited" | "low-photo" | "double-coverage";
}) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
      <td className="py-2 pl-3 text-[11px] text-gray-400 font-medium align-middle">{index}</td>
      <td className="py-2 pl-1 align-middle">
        <span className="text-[11px] text-gray-400 font-mono">{row.customerId}</span>
      </td>
      <td className="py-2 align-middle">
        <span className="text-[11px] sm:text-[12px] text-gray-700 truncate block max-w-[140px] sm:max-w-[260px]" title={row.customerName}>
          {row.customerName}
        </span>
      </td>
      {variant === "low-photo" && (
        <td className="py-2 pr-3 text-right align-middle">
          <span className="text-[11px] sm:text-[12px] font-bold text-yellow-500">{row.totalPhotos ?? 0}</span>
          <span className="text-[10px] text-gray-400 ml-1">foto</span>
        </td>
      )}
      {variant === "double-coverage" && (
        <td className="py-2 pr-3 text-right align-middle">
          <span className="text-[11px] sm:text-[12px] font-bold text-blue-500">{row.salesmanCount ?? 0}</span>
          <span className="text-[10px] text-gray-400 ml-1">sales</span>
        </td>
      )}
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  totalRows,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalRows);

  // Build page numbers — show up to 5 around current
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
      <span className="text-[10px] sm:text-[11px] text-gray-400">
        Menampilkan <span className="font-semibold text-gray-600">{from}–{to}</span> dari{" "}
        <span className="font-semibold text-gray-600">{totalRows.toLocaleString("id-ID")}</span> data
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconChevronLeft />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-[11px] text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`min-w-[28px] h-7 rounded-lg text-[11px] font-medium border transition-colors ${
                p === page
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-white"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}

// ─── Badge chip ───────────────────────────────────────────────────────────────

const VARIANT_META: Record<
  LovModalVariant,
  { label: string; badgeClass: string; emptyText: string }
> = {
  "salesman-top": {
    label: "Top Salesman",
    badgeClass: "bg-blue-100 text-blue-700",
    emptyText: "Tidak ada data salesman.",
  },
  "salesman-bottom": {
    label: "Bottom Salesman",
    badgeClass: "bg-red-100 text-red-600",
    emptyText: "Tidak ada data salesman.",
  },
  "not-visited": {
    label: "Belum Dikunjungi",
    badgeClass: "bg-red-100 text-red-600",
    emptyText: "Semua outlet sudah dikunjungi.",
  },
  "low-photo": {
    label: "Foto Rendah",
    badgeClass: "bg-yellow-100 text-yellow-700",
    emptyText: "Tidak ada outlet dengan foto rendah.",
  },
  "double-coverage": {
    label: "Double Coverage",
    badgeClass: "bg-blue-100 text-blue-700",
    emptyText: "Tidak ada double coverage.",
  },
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function LovModal({
  open,
  onClose,
  variant,
  onFetch,
  title,
  limit = LIMIT,
}: LovModalProps) {
  const [rows, setRows] = useState<LovModalRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const meta = VARIANT_META[variant];
  const isSalesman = variant === "salesman-top" || variant === "salesman-bottom";

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset on open/variant change
  useEffect(() => {
    if (open) {
      setPage(1);
      setSearch("");
      setDebouncedSearch("");
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, variant]);

  // Fetch on page / search change
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    onFetch({ page, limit, search: debouncedSearch })
      .then(({ data, pagination: pg }) => {
        if (cancelled) return;
        setRows(data);
        setPagination(pg);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("LovModal fetch error:", err);
        setError("Gagal memuat data. Silakan coba lagi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, page, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    // Scroll table to top on page change
    document.getElementById("lov-modal-table-wrap")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const displayTitle = title ?? meta.label;
  const totalRows = pagination?.totalRows ?? 0;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 sm:px-4"
      style={{ animation: "fadeIn 0.15s ease" }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(32px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          animation: "slideUp 0.2s ease",
          maxHeight: "90dvh",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
              {meta.label}
            </span>
            <h2 className="text-[13px] sm:text-[14px] font-bold text-gray-800 truncate">{displayTitle}</h2>
            {totalRows > 0 && (
              <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                ({totalRows.toLocaleString("id-ID")} data)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <IconSearch />
            </span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder={
                isSalesman
                  ? "Cari nama atau NIK salesman..."
                  : "Cari nama atau ID outlet..."
              }
              className="w-full pl-9 pr-4 py-2 text-[12px] sm:text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 placeholder-gray-400 text-gray-700 transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <IconX />
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div
          id="lov-modal-table-wrap"
          className="flex-1 overflow-auto"
        >
          {loading ? (
            <div className="flex flex-col gap-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
                  <div className="w-5 h-3 bg-gray-100 animate-pulse rounded" />
                  <div className="flex-1 flex gap-3">
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-32 sm:w-48" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-20 hidden sm:block" />
                  </div>
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-12" />
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-8 h-8 mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12px]">{error}</p>
              <button
                onClick={() => onFetch({ page, limit, search: debouncedSearch })}
                className="mt-3 text-[11px] text-blue-500 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-8 h-8 mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[12px]">
                {search ? `Tidak ada hasil untuk "${search}"` : meta.emptyText}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              {isSalesman ? (
                <>
                  <SalesmanTableHead variant={variant as "salesman-top" | "salesman-bottom"} />
                  <tbody>
                    {rows.map((row, i) =>
                      isSalesmanRow(row) ? (
                        <SalesmanTableRow
                          key={i}
                          row={row}
                          index={(page - 1) * limit + i + 1}
                          variant={variant as "salesman-top" | "salesman-bottom"}
                        />
                      ) : null
                    )}
                  </tbody>
                </>
              ) : (
                <>
                  <OutletTableHead variant={variant as "not-visited" | "low-photo" | "double-coverage"} />
                  <tbody>
                    {rows.map((row, i) =>
                      isOutletRow(row) ? (
                        <OutletTableRow
                          key={i}
                          row={row}
                          index={(page - 1) * limit + i + 1}
                          variant={variant as "not-visited" | "low-photo" | "double-coverage"}
                        />
                      ) : null
                    )}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex-shrink-0">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              totalRows={pagination.totalRows}
              limit={limit}
              onPage={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}