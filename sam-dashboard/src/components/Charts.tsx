import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

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
        cutout: "65%",
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
          label: "Offline Devices",
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