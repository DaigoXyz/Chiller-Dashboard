// ─── Loading Skeleton Component ────────────────────────────────────────────────
export function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 min-w-0 w-full">
      <SkeletonPulse className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full" />
      <div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
        <SkeletonPulse className="h-2.5 sm:h-3 w-16 sm:w-20" />
        <SkeletonPulse className="h-5 sm:h-6 w-20 sm:w-24" />
        <SkeletonPulse className="h-2 w-14 sm:w-16" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      <SkeletonPulse className="h-3 sm:h-4 w-32 sm:w-40 mb-3 sm:mb-4" />
      <SkeletonPulse className="h-36 sm:h-48 w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4 w-full">
      <SkeletonPulse className="h-3 sm:h-4 w-32 sm:w-40 mb-3 sm:mb-4" />
      <div className="space-y-2 sm:space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 sm:gap-4">
            <SkeletonPulse className="h-2.5 sm:h-3 w-24 sm:w-32" />
            <SkeletonPulse className="h-2.5 sm:h-3 w-16 sm:w-20 hidden sm:block" />
            <SkeletonPulse className="h-2.5 sm:h-3 w-16 sm:w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 sm:justify-between">
        <div className="flex-1">
          <SkeletonPulse className="h-4 sm:h-5 w-48 sm:w-60 mb-2" />
          <SkeletonPulse className="h-3 w-32 sm:w-40" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonPulse key={i} className="h-10 sm:h-12 w-20 sm:w-24" />
          ))}
        </div>
      </div>

      {/* Stat Cards Skeleton — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Key Insights Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4">
        <SkeletonPulse className="h-3 sm:h-4 w-28 sm:w-32 mb-3" />
        <div className="flex gap-3 overflow-x-auto sm:flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonPulse key={i} className="h-16 sm:h-8 min-w-[200px] sm:w-full flex-shrink-0 sm:flex-shrink" />
          ))}
        </div>
      </div>

      {/* Performance Charts Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <SkeletonPulse className="h-3 sm:h-4 w-40 sm:w-48 mb-3 sm:mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Tables Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <TableSkeleton key={i} />
        ))}
      </div>

      {/* Trend Chart Skeleton */}
      <ChartSkeleton />
    </div>
  );
}