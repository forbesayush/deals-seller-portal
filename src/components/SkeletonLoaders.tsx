import React from 'react';

export function KPICardSkeleton() {
  return (
    <div className="premium-card p-4 space-y-3 animate-pulse border border-slate-200/50 dark:border-slate-800/50">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-32" />
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-16" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="premium-card p-5 space-y-4 animate-pulse border border-slate-200/50 dark:border-slate-800/50">
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-40" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20" />
      </div>
      <div className="h-48 bg-slate-200/60 dark:bg-slate-800/40 rounded-2xl flex items-end justify-between p-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-full bg-slate-300/80 dark:bg-slate-700/60 rounded-t-lg"
            style={{ height: `${(i % 5 + 2) * 18}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="premium-card overflow-hidden animate-pulse border border-slate-200/50 dark:border-slate-800/50">
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
