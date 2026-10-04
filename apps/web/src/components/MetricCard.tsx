import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose' | 'purple';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
}: MetricCardProps) {
  const colorStyles = {
    indigo: {
      border: 'border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700',
      iconBg: 'bg-indigo-600 text-white shadow-indigo-500/20',
      accentGlow: 'from-indigo-500/5 to-transparent',
    },
    emerald: {
      border: 'border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
      accentGlow: 'from-emerald-500/5 to-transparent',
    },
    amber: {
      border: 'border-amber-100 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700',
      iconBg: 'bg-amber-600 text-white shadow-amber-500/20',
      accentGlow: 'from-amber-500/5 to-transparent',
    },
    blue: {
      border: 'border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700',
      iconBg: 'bg-blue-600 text-white shadow-blue-500/20',
      accentGlow: 'from-blue-500/5 to-transparent',
    },
    rose: {
      border: 'border-rose-100 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700',
      iconBg: 'bg-rose-600 text-white shadow-rose-500/20',
      accentGlow: 'from-rose-500/5 to-transparent',
    },
    purple: {
      border: 'border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700',
      iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
      accentGlow: 'from-purple-500/5 to-transparent',
    },
  };

  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border ${style.border} shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${style.accentGlow} pointer-events-none rounded-bl-full`}
      />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {value}
            </h3>
            {trend && (
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                  trend.isPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-105 ${style.iconBg}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
