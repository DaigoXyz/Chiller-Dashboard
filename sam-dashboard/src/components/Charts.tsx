import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement,
  Filler,
} from "chart.js";

import { Doughnut, Bar, Line, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement,
  Filler
);

ChartJS.defaults.color = "rgba(226,232,240,0.85)";
ChartJS.defaults.borderColor = "rgba(148,163,184,0.12)";
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.plugins.legend.labels.boxHeight = 10;
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
ChartJS.defaults.plugins.legend.labels.font = { size: 11 };

ChartJS.register(LinearScale, PointElement, LineElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function CollectionFullListScroll({ items }: { items: any[] }) {
  const sortedItems = [...items].sort((a, b) => {
    const aStatus = a.failed > 0 ? 2 : (a.inProgress > 0 ? 1 : 0);
    const bStatus = b.failed > 0 ? 2 : (b.inProgress > 0 ? 1 : 0);
    if (aStatus !== bStatus) return bStatus - aStatus;
    return a.name.localeCompare(b.name);
  });

  const chartData = {
    labels: sortedItems.map(item => item.name),
    datasets: [
      {
        data: sortedItems.map(item => item.success + item.failed + item.inProgress),
        backgroundColor: sortedItems.map(item => {
          if (item.failed > 0) return '#fa1b40';
          if (item.inProgress > 0) return 'rgba(251, 191, 36, 0.9)';
          return 'rgba(0, 255, 170, 0.85)';
        }),
        borderRadius: 2,
        barThickness: 8,
      },
    ],
  };

  const textLabelsPlugin = {
    id: 'textLabelsPlugin',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      
      ctx.save();
      // Gunakan font yang sedikit lebih kontras dan ukuran pas
      ctx.font = 'bold 9px "JetBrains Mono", monospace'; 
      ctx.textBaseline = 'middle';

      chart.getDatasetMeta(0).data.forEach((bar: any, i: number) => {
        const item = sortedItems[i];
        
        // Susun teks info
        const text = `S:${item.success} F:${item.failed} P:${item.inProgress}`;
        
        // Tentukan warna teks berdasarkan status biar makin jelas
        // Kalau failed > 0, kasih warna merah pucat biar kelihatan
        ctx.fillStyle = item.failed > 0 ? '#fda4af' : '#94a3b8';

        // OFFSET LOGIC:
        // Kita gambar teks di koordinat X ujung bar + 5px
        // Kalau bar-nya kepanjangan banget, kita taruh teksnya DI DALAM bar (ujung kanan)
        const chartWidth = chart.width;
        const textWidth = ctx.measureText(text).width;
        
        let xPos = bar.x + 5;
        
        // Cek kalau teksnya bakal keluar dari layar/canvas
        if (xPos + textWidth > chartWidth - 10) {
          xPos = bar.x - textWidth - 5; // Pindahin ke dalem bar
          ctx.fillStyle = '#fff'; // Putih biar kontras di dalem bar
        }

        ctx.fillText(text, xPos, bar.y);
      });
      ctx.restore();
    }
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 80 // Kasih space luas di kanan biar teks S F P nggak kepotong
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { 
        enabled: true, // Ini buat nyalain/matiin popup hover
        callbacks: {
          // Ini fungsi buat custom tulisan di dalam popupnya
          label: (context: any) => {
            const item = sortedItems[context.dataIndex];
            const total = item.success + item.failed + item.inProgress;
            const rate = total > 0 ? ((item.success / total) * 100).toFixed(2) : "0.00";
            
            // Return array string ini bakal jadi baris-baris teks di popup
            return [
              `Total: ${total} records`,
              ` Success: ${item.success}`,
              ` In Progress: ${item.inProgress}`,
              ` Failed: ${item.failed}`,
              ` Success Rate: ${rate}%`
            ];
          }
        }
      }
    },
    scales: {
      x: { display: false },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 9 }, autoSkip: false }
      }
    }
  };

  return (
    <div className="h-[140px] overflow-y-auto pr-1 custom-scrollbar">
      <div style={{ height: `${items.length * 24}px` }}>
        {/* Masukkan plugin custom ke dalam prop plugins */}
        <Bar 
          data={chartData} 
          options={options as any} 
          plugins={[textLabelsPlugin]} 
        />
      </div>
    </div>
  );
}

export function CollectionScatterChart({ items }: { items: any[] }) {
  const jitteredData = items.map((item) => {
    const total = item.success + item.failed + item.inProgress || 0;
    const successRate = total > 0 ? (item.success / total) * 100 : 0;
    
    return {
      x: total,
      y: successRate === 100 
        ? 100 - (Math.random() * 3) 
        : successRate + (Math.random() * 2 - 1),
      name: item.name,
      actualY: successRate,
      failed: item.failed,
      inProgress: item.inProgress,
      // Tambahkan status buat bantu pewarnaan
      status: item.failed > 0 ? 'error' : (item.inProgress > 0 ? 'running' : 'ok')
    };
  });

  const chartData = {
    datasets: [
      {
        label: 'Collections Health',
        data: jitteredData, 
        backgroundColor: (context: any) => {
          const d = context.raw;
          if (!d) return 'rgba(16, 185, 129, 0.5)';
          
          // LOGIKA 3 WARNA
          if (d.status === 'error') return '#fa1b40'; // Merah
          if (d.status === 'running') return 'rgba(251, 191, 36, 1)'; // Kuning Amber
          return 'rgba(0, 255, 170, 0.6)'; // Hijau Neon
        },
        pointRadius: 6,
        pointHoverRadius: 9,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, right: 20, left: 10, bottom: 10 } },
    scales: {
      x: {
        type: 'linear',
        // Kasih sedikit ruang negatif supaya titik 0 punya napas
        min: -2, 
        grace: '5%',
        title: { 
          display: true, 
          text: 'Total Records', 
          color: '#64748b', 
          font: { size: 10 } 
        },
        grid: { 
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false, 
        },
        ticks: { 
          color: '#64748b',
          callback: function(value: any) {
            return value >= 0 ? value : '';
          }
        }
      },
      y: {
        min: -5, 
        max: 105, 
        title: { display: true, text: 'Success Rate (%)', color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { 
          color: '#64748b',
          callback: (value: any) => (value >= 0 && value <= 100) ? value + '%' : ''
        }
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const d = context.raw;
            return [
              `Collection: ${d.name}`,
              ` Success: ${d.actualY.toFixed(2)}%`,
              ` In Progress: ${d.inProgress}`,
              ` Failed: ${d.failed}`,
              ` Total: ${d.x} Records`
            ];
          }
        }
      },
      legend: { display: false }
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Total Collection Firestore Scatter</h3>
        <div className="flex gap-3 items-center">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[#fa1b40]"></span> Failed
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[rgba(251,191,36,1)]"></span> Syncing
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[rgba(0,255,170,1)]"></span> Healthy
            </div>
        </div>
      </div>
      <div className="h-80">
        <Scatter data={chartData} options={options as any} />
      </div>
    </div>
  );
}

export function FullCollectionHealthGrid({ items }: { items: any[] }) {
  // Sort supaya posisi konsisten (A-Z)
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-200">Total Collection Firestore Heatmap</h3>
          <p className="text-xs text-slate-500">Real-time status of all 71 system pipelines</p>
        </div>
        <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-emerald-400">● Healthy</span>
          <span className="flex items-center gap-1.5 text-rose-500">● Error</span>
        </div>
      </div>

      {/* Grid 71 Kotak - Tampil semua tanpa filter */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        {sortedItems.map((item, idx) => {
          const isFailed = item.failed > 0;
          const isInProgress = item.inProgress > 0;
          
          // Logika Inisial: Ambil 2 huruf (Misal: visit_config -> VC, route -> RO)
          const nameParts = item.name.split('_');
          const initial = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : item.name.substring(0, 2).toUpperCase();

          // Hitung Success Rate secara manual atau dari data SQL
          const total = item.success + item.failed + item.inProgress || 0;
          const successRate = total > 0 ? ((item.success / total) * 100).toFixed(2) : "0.00";

          return (
            <div key={idx} className="group relative">
              <div
                className={`h-10 w-full rounded-md border flex items-center justify-center transition-all cursor-help
                  ${isFailed ? "bg-rose-500 border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]" : 
                    isInProgress ? "bg-amber-500 border-amber-400" : 
                    "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400"}`}
              >
                <span className={`text-[10px] font-bold ${isFailed || isInProgress ? "text-white" : "text-emerald-400/70"}`}>
                  {initial}
                </span>

                {/* Tooltip Detil (Total Records & Success Rate) */}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 scale-0 transition-all group-hover:scale-100 z-[100]">
                  <div className="rounded-lg border border-white/20 bg-slate-950 p-3 shadow-2xl text-[11px] text-slate-200">
                    <div className="mb-2 border-b border-white/10 pb-1 flex justify-between items-center">
                       <span className="font-bold text-white truncate mr-2">{item.name}</span>
                       <span className={`text-[9px] px-1 rounded ${isFailed ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                         {isFailed ? 'ERROR' : 'OK'}
                       </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Records:</span> 
                        <span className="font-mono text-white">{total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Success Rate:</span> 
                        <span className={`font-mono font-bold ${Number(successRate) < 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {successRate}%
                        </span>
                      </div>
                      <div className="mt-2 pt-1 flex gap-1 items-center justify-center border-t border-white/5">
                        <span className="text-emerald-500">S:{item.success}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-500">P:{item.inProgress}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-rose-500">F:{item.failed}</span>
                      </div>
                    </div>
                  </div>
                  {/* Arrow tooltip */}
                  <div className="mx-auto -mt-1 h-2 w-2 rotate-45 border-b border-r border-white/20 bg-slate-950"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionHealthHeatmapMini({ items }: { items: any[] }) {
  return (
    <div className="h-full w-full">
      {/* Grid Container: 10 kolom agar pas di box kecil */}
      <div className="grid grid-cols-10 gap-1">
        {items.map((item, idx) => {
          // Logika Warna
          let bgClass = "bg-emerald-500/40"; // Default Sukses (Transparan dikit biar elegan)
          let borderClass = "border-emerald-500/50";
          
          if (item.failed > 0) {
            bgClass = "bg-rose-500 animate-pulse"; 
            borderClass = "border-rose-400";
          } else if (item.inProgress > 0) {
            bgClass = "bg-amber-500";
            borderClass = "border-amber-400";
          }

          return (
            <div
              key={idx}
              className={`group relative h-3 w-full rounded-[2px] border ${bgClass} ${borderClass} cursor-help transition-transform hover:scale-150 hover:z-50`}
            >
              {/* Tooltip Floating */}
              <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 scale-0 group-hover:scale-100 transition-all z-[100]">
                <div className="bg-slate-900 border border-white/20 p-2 rounded shadow-2xl text-[10px] text-white">
                  <p className="font-bold border-b border-white/10 mb-1 truncate">{item.name}</p>
                  <div className="flex justify-between"><span>Success:</span> <span>{item.success}</span></div>
                  {item.failed > 0 && <div className="flex justify-between text-rose-400"><span>Failed:</span> <span>{item.failed}</span></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-slate-500 italic">
        <span>71 Collections</span>
        <span className="flex gap-2">
          <span className="text-emerald-400">● OK</span>
          <span className="text-rose-400">● Error</span>
        </span>
      </div>
    </div>
  );
}

export function DeviceSyncDoughnut(props: { upToDate: number; failed: number; outdated: number }) {
  return (
    <Doughnut
      data={{
        labels: ["Up-to-Date", "Failed", "Outdated"],
        datasets: [{
          data: [props.upToDate, props.failed, props.outdated],
          backgroundColor: [
            "rgba(16, 185, 129, 0.9)",  // emerald/green
            "rgba(239, 68, 68, 0.9)",   // red
            "rgba(251, 191, 36, 0.9)",  // amber/yellow
          ],
          borderColor: [
            "rgba(16, 185, 129, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(251, 191, 36, 1)",
          ],
          borderWidth: 2,
        }]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "rgba(226, 232, 240, 1)",
            bodyColor: "rgba(203, 213, 225, 1)",
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
          }
        }
      }}
    />
  );
}

export function OfflineDevicesPie(props: { shortOffline: number; mediumOffline: number; longOffline: number }) {
  return (
    <Pie
      data={{
        labels: ["Short Offline", "Medium Offline", "Long Offline"],
        datasets: [{
          data: [props.shortOffline, props.mediumOffline, props.longOffline],
          backgroundColor: [
            "rgba(14, 165, 233, 0.9)",   // sky blue - short
            "rgba(251, 191, 36, 0.9)",   // amber - medium
            "rgba(239, 68, 68, 0.9)",    // red - long
          ],
          borderColor: [
            "rgba(14, 165, 233, 1)",
            "rgba(251, 191, 36, 1)",
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 2,
        }]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "rgba(226, 232, 240, 1)",
            bodyColor: "rgba(203, 213, 225, 1)",
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
          }
        }
      }}
    />
  );
}

export function PushGaugeLike(props: { valuePercent: number }) {
  const v = Math.max(0, Math.min(100, props.valuePercent));
  
  // Determine color based on percentage
  const getColor = (value: number) => {
    if (value >= 90) return "rgba(16, 185, 129, 0.9)"; // green
    if (value >= 70) return "rgba(251, 191, 36, 0.9)"; // yellow
    return "rgba(239, 68, 68, 0.9)"; // red
  };

  return (
    <Doughnut
      data={{
        labels: ["Success", "Failed"],
        datasets: [{
          data: [v, 100 - v],
          backgroundColor: [
            getColor(v),
            "rgba(239, 68, 68, 0.85)", // Red for the remaining/failed portion
          ],
          borderColor: [
            getColor(v).replace("0.9", "1"),
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 0,
        }]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        circumference: 180,
        rotation: 270,
        cutout: "75%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }}
    />
  );
}

export function ThroughputGauge(props: { value: number; max?: number }) {
  const maxValue = props.max || 100;
  const percentage = Math.max(0, Math.min(100, (props.value / maxValue) * 100));
  
  // Calculate rotation angle for the needle (180 degrees span)
  const needleAngle = -90 + (percentage * 1.8); // -90 to 90 degrees
  
  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <Doughnut
        data={{
          labels: ["Low", "Medium", "High"],
          datasets: [{
            data: [33.33, 33.33, 33.34], // Equal segments
            backgroundColor: [
              "rgba(239, 68, 68, 0.85)",    // Red - Low (0-33%)
              "rgba(251, 191, 36, 0.85)",   // Yellow - Medium (34-66%)
              "rgba(16, 185, 129, 0.85)",   // Green - High (67-100%)
            ],
            borderColor: [
              "rgba(239, 68, 68, 1)",
              "rgba(251, 191, 36, 1)",
              "rgba(16, 185, 129, 1)",
            ],
            borderWidth: 3,
          }]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          circumference: 180,
          rotation: 270,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }}
      />
      
      {/* Needle - redesigned for better visibility */}
      <div 
        className="absolute"
        style={{
          bottom: '22%',
          left: '50%',
          width: '4px',
          height: '40%',
          transformOrigin: 'bottom center',
          transform: `translateX(-50%) rotate(${needleAngle}deg)`,
          transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      >
        {/* Main needle body - gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-600 via-red-500 to-red-400 rounded-full shadow-lg" />
        
        {/* Needle glow effect */}
        <div className="absolute inset-0 bg-red-400 rounded-full blur-sm opacity-50" />
        
        {/* Sharp tip */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-red-500" />
      </div>
      
      {/* Center pivot - larger and more visible */}
      <div className="absolute" style={{ bottom: '10%', left: '54%', transform: 'translate(-50%, 0)' }}>
        {/* Outer glow */}
        <div className="absolute inset-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-red-500/30 rounded-full blur-md" />
        {/* Main circle */}
        <div className="relative w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full border-2 border-red-500/50 shadow-xl" />
      </div>
      
      {/* Value display - improved typography */}
      <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 text-center">
        <div className="text-3xl font-bold text-white tracking-tight">{props.value}</div>
        <div className="text-xs text-slate-400 font-medium mt-0.5">Req/Min</div>
      </div>
      
      {/* Scale markers */}
      <div className="absolute inset-0">
        {/* 0% marker */}
        <div className="absolute text-[10px] font-semibold text-red-400" style={{ bottom: '20%', left: '8%' }}>0</div>
        {/* 50% marker */}
        <div className="absolute text-[10px] font-semibold text-amber-400" style={{ bottom: '52%', left: '50%', transform: 'translateX(-50%)' }}>{Math.round(maxValue / 2)}</div>
        {/* 100% marker */}
        <div className="absolute text-[10px] font-semibold text-emerald-400" style={{ bottom: '20%', right: '8%' }}>{maxValue}</div>
      </div>
    </div>
  );
}

export function SyncSuccessStackedBar(props: { labels: string[]; success: number[]; failed: number[]; delayed: number[] }) {
  return (
    <Line
      data={{
        labels: props.labels,
        datasets: [
          {
            label: "Success",
            data: props.success,
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.85)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            pointBorderColor: "rgba(15, 23, 42, 1)",
            pointBorderWidth: 2,
          },
          {
            label: "Failed",
            data: props.failed,
            borderColor: "rgba(239, 68, 68, 1)",
            backgroundColor: "rgba(239, 68, 68, 0.85)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "rgba(239, 68, 68, 1)",
            pointBorderColor: "rgba(15, 23, 42, 1)",
            pointBorderWidth: 2,
          },
          {
            label: "Delayed",
            data: props.delayed,
            borderColor: "rgba(251, 191, 36, 1)",
            backgroundColor: "rgba(251, 191, 36, 0.85)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "rgba(251, 191, 36, 1)",
            pointBorderColor: "rgba(15, 23, 42, 1)",
            pointBorderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom" as const,
            labels: {
              padding: 15,
              font: { size: 11 },
              usePointStyle: true,
              pointStyle: "circle",
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "rgba(226, 232, 240, 1)",
            bodyColor: "rgba(203, 213, 225, 1)",
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { size: 10 },
              color: "rgba(148, 163, 184, 0.8)",
            },
            border: {
              display: false,
            }
          },
          y: {
            grid: {
              color: "rgba(148, 163, 184, 0.1)",
              drawTicks: false,
            },
            ticks: {
              font: { size: 10 },
              color: "rgba(148, 163, 184, 0.8)",
              padding: 8,
            },
            border: {
              display: false,
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
      }}
    />
  );
}

export function OfflineDevicesLine(props: { labels: string[]; counts: number[] }) {
  // Function to determine color based on count value
  const getColorForValue = (value: number) => {
    if (value >= 17) return "rgba(239, 68, 68, 0.85)";    // Red - Critical (>=17)
    if (value >= 14) return "rgba(251, 191, 36, 0.85)";   // Amber - Warning (14-16)
    return "rgba(14, 165, 233, 0.85)";                     // Sky Blue - Normal (<14)
  };

  const getBorderColorForValue = (value: number) => {
    if (value >= 17) return "rgba(239, 68, 68, 1)";
    if (value >= 14) return "rgba(251, 191, 36, 1)";
    return "rgba(14, 165, 233, 1)";
  };

  // Create background colors array based on counts
  const backgroundColors = props.counts.map(count => getColorForValue(count));
  const borderColors = props.counts.map(count => getBorderColorForValue(count));

  return (
    <Bar
      data={{
        labels: props.labels,
        datasets: [{
          label: "Pull Data",
          data: props.counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 0,
          borderRadius: 6,
        }]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom" as const,
            labels: {
              padding: 15,
              font: { size: 11 },
              usePointStyle: true,
              pointStyle: "circle",
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "rgba(226, 232, 240, 1)",
            bodyColor: "rgba(203, 213, 225, 1)",
            borderColor: "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y!;
                let severity = "Normal";
                if (value >= 17) severity = "Critical";
                else if (value >= 14) severity = "Warning";
                return `Offline Devices: ${value} (${severity})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { size: 10 },
              color: "rgba(148, 163, 184, 0.8)",
            },
            border: {
              display: false,
            }
          },
          y: {
            grid: {
              color: "rgba(148, 163, 184, 0.1)",
              drawTicks: false,
            },
            ticks: {
              font: { size: 10 },
              color: "rgba(148, 163, 184, 0.8)",
              padding: 8,
            },
            border: {
              display: false,
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
      }}
    />
  );
}