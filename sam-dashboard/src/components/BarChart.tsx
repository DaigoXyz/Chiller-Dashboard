import ReactApexChart from "react-apexcharts";

export interface ChartData {
  label: string;
  value: number;
}

export interface BarChartProps {
  title?: string;
  data?: ChartData[];
  badgeTitle?: string;
  badgeDesc?: string;
  colors?: string[];
  valuePrefix?: string;
  valueSuffix?: string;
  hideCard?: boolean;
}

export default function BarChart({
  title = "JUMLAH FOTO PER CHANNEL",
  data = [],
  badgeTitle = "GT vs MT",
  badgeDesc = "lebih banyak foto di GT",
  colors = ["#3B82F6", "#10B981"],
  valuePrefix = "",
  valueSuffix = "",
  hideCard = false,
}: BarChartProps) {
  const a = data[0];
  const b = data[1];
  const diff = a && b && b.value > 0 ? ((a.value - b.value) / b.value) * 100 : 0;
  const isPositive = diff >= 0;
  const diffStr = `${isPositive ? "+" : ""}${diff.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const fmt = (n: number) => valuePrefix + n.toLocaleString("id-ID") + valueSuffix;

  const chartOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", animations: { speed: 600 } },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "50%",
        distributed: true,
        dataLabels: { position: "top" }
      }
    },
    colors,
    dataLabels: {
      enabled: true,
      formatter: (val: number) => fmt(val),
      style: { fontSize: "11px", fontWeight: "600", colors: ["#374151"] },
      offsetY: -22,
    },
    legend: { show: false },
    grid: { borderColor: "#f3f4f6", yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: data.map(d => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px", fontWeight: "500", colors: "#6B7280" } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val >= 1000 ? (val / 1000).toFixed(0) + "K" : val,
        style: { fontSize: "10px", colors: "#9CA3AF" },
      },
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px" },
      y: { formatter: (val: number) => fmt(val) },
    },
  };

  const innerContent = (
    <>
      <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-gray-600 mb-2">{title}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1 min-w-0">
          <ReactApexChart
            options={chartOptions}
            series={[{ name: title, data: data.map(d => d.value) }]}
            type="bar"
            height={200}
          />
        </div>
        <div className="w-full sm:flex-shrink-0 sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center sm:min-w-[100px]">
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium mb-1">{badgeTitle}</p>
          <p className={`text-lg sm:text-xl font-bold leading-tight ${isPositive ? "text-emerald-500" : "text-red-500"}`}>{diffStr}</p>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 leading-snug">{badgeDesc}</p>
        </div>
      </div>
    </>
  );

  if (hideCard) {
    return <div className="w-full">{innerContent}</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      {innerContent}
    </div>
  );
}