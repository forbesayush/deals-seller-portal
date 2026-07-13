import React from 'react';

interface WidgetProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

export const DashboardWidget: React.FC<WidgetProps> = ({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral',
  colorClass = 'from-violet-500 to-indigo-500'
}) => {
  return (
    <div className="glass-card overflow-hidden rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-5 rounded-bl-full group-hover:scale-110 transition-transform duration-500`} />
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2 tracking-tight">{value}</h3>
          
          {trend && (
            <div className="flex items-center gap-1 mt-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                trendType === 'up' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                  : trendType === 'down' 
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' 
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {trend}
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
        </div>

        <div className={`w-12 h-12 bg-gradient-to-tr ${colorClass} rounded-xl flex items-center justify-center text-white text-xl shadow-sm shadow-indigo-200 dark:shadow-none`}>
          <span>{icon}</span>
        </div>
      </div>
    </div>
  );
};
