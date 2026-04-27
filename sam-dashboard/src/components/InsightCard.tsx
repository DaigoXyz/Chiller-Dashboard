import React from "react";

export interface InsightCardProps {
  icon: React.ReactElement;
  variant?: "danger" | "warning" | "info" | "success";
  text?: string;
  subtext?: string;
}

export interface KeyInsightsProps {
  title?: string;
  items?: InsightCardProps[];
}

const variantStyles = {
  danger:  { bg: "bg-red-50",    border: "border-red-200",    icon: "text-red-500",    bold: "text-red-600" },
  warning: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-500", bold: "text-yellow-700" },
  info:    { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-500",   bold: "text-blue-700" },
  success: { bg: "bg-green-50",  border: "border-green-200",  icon: "text-green-500",  bold: "text-green-700" },
};

export function InsightCard({ icon, variant = "danger", text = "", subtext }: InsightCardProps) {
  const s = variantStyles[variant];

  const renderText = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} className={`font-bold ${s.bold}`}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5 ${s.bg} ${s.border} flex-1 min-w-[160px]`}>
      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center ${s.border} bg-white`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: `w-4 h-4 sm:w-5 sm:h-5 ${s.icon}` })}
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-gray-700 leading-snug">{renderText(text)}</p>
        {subtext && <span className="text-[11px] sm:text-[12px] text-gray-400 mt-0.5">{subtext}</span>}
      </div>
    </div>
  );
}

export default function KeyInsights({ title = "KEY INSIGHTS", items = [] }: KeyInsightsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 w-full">
      <p className="text-[11px] sm:text-[13px] font-bold tracking-widest uppercase text-gray-700 mb-3">{title}</p>
      {/* Mobile: scrollable horizontal row; Tablet+: wrap grid */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
        {items.map((item, i) => <InsightCard key={i} {...item} />)}
      </div>
    </div>
  );
}