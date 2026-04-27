export interface SalesmanData {
  salesman: string;
  team: string;
  totalFoto: number;
  outletCoverage: number;
}

export interface SalesmanRankTableProps {
  title?: string;
  variant?: "top" | "bottom";
  data?: SalesmanData[];
  maxFoto?: number;
  linkLabel?: string;
  onLinkClick?: () => void;
}

export default function SalesmanRankTable({
  title = "TOP 5 SALESMAN PERFORMER",
  variant = "top",
  data = [],
  linkLabel = "Lihat semua salesman",
  onLinkClick,
}: SalesmanRankTableProps) {
  const isTop = variant === "top";
  const barColor = isTop ? "bg-blue-500" : "bg-red-400";
  const pctColor = isTop ? "text-blue-600" : "text-red-500";

  const fmt = (n: number) => n.toLocaleString("id-ID");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600 mb-3">{title}</p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full border-collapse table-fixed min-w-[320px]">
          <colgroup>
            <col style={{ width: "20px" }} />
            <col style={{ width: "28%" }} />
            <col className="hidden sm:table-column" style={{ width: "32%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr className="text-[10px] sm:text-[11px] text-gray-400 font-semibold">
              <th className="text-left pb-2"></th>
              <th className="text-left pb-2">Salesman</th>
              <th className="text-left pb-2 hidden sm:table-cell">Team</th>
              <th className="text-left pb-2">Total Foto</th>
              <th className="text-right pb-2">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              return (
                <tr key={i} className="border-t border-gray-50">
                  <td className="py-1.5 sm:py-2 pr-1 text-[11px] sm:text-[12px] text-gray-400 font-medium align-middle">{i + 1}</td>
                  <td className="py-1.5 sm:py-2 pr-2 align-middle">
                    <span
                      className="text-[11px] sm:text-[12px] text-gray-700 font-medium block truncate"
                      title={row.salesman}
                    >
                      {row.salesman}
                    </span>
                  </td>
                  <td className="py-1.5 sm:py-2 pr-3 align-middle hidden sm:table-cell">
                    <span
                      className="text-[11px] sm:text-[12px] text-gray-500 block truncate"
                      title={row.team}
                    >
                      {row.team}
                    </span>
                  </td>
                  <td className="py-1.5 sm:py-2 pr-2 align-middle">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] sm:text-[12px] text-gray-700 leading-none">{fmt(row.totalFoto)}</span>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(row.outletCoverage, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className={`py-1.5 sm:py-2 text-right text-[11px] sm:text-[12px] font-bold align-middle ${pctColor}`}>
                    {row.outletCoverage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={onLinkClick} className="mt-3 flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-blue-600 hover:underline">
        {linkLabel} <span>→</span>
      </button>
    </div>
  );
}