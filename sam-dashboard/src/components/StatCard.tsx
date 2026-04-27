import React from "react";

export interface StatCardTrend {
  label?: string;
  direction: "up" | "down";
  value: string;
}

export interface StatCardProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  label?: string;
  value?: string | number;
  trend?: StatCardTrend;
  target?: string;
  suffix?: string;
}

export default function StatCard({
  icon = "camera",
  iconBg = "bg-blue-100",
  iconColor = "text-blue-500",
  label = "Label",
  value = "0",
  trend,
  target,
  suffix,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 min-w-0 w-full">
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 leading-tight truncate">
          {label}
        </span>

        <div className="flex items-baseline gap-1 flex-wrap my-0.5 sm:my-1">
          <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 leading-none tracking-tight truncate">
            {value}
          </span>
          {suffix && (
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium leading-tight">{suffix}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {target && (
            <span className="text-[10px] sm:text-[11px] text-gray-400 leading-tight truncate">{target}</span>
          )}
          {trend && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {trend.label && (
                <span className="text-[10px] sm:text-[11px] text-gray-400 hidden sm:inline">{trend.label}</span>
              )}
              <span className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold ${
                trend.direction === "up" ? "text-emerald-500" : "text-red-500"
              }`}>
                {trend.direction === "up" ? "▲" : "▼"} {trend.value}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}