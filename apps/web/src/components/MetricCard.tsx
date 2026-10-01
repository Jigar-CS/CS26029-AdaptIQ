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
      bg: 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-500/30',
      iconBg: 'bg-indigo-600 text-white',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-600 text-white',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/30',
      iconBg: 'bg-amber-600 text-white',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-500/30',
      iconBg: 'bg-blue-600 text-white',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-500/30',
      iconBg: 'bg-rose-600 text-white',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-500/30',
      iconBg: 'bg-purple-600 text-white',
    },
  };

  const style = colorStyles[color];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md hover-lift relative overflow-hidden transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</h3>
            {trend && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  trend.isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>

        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${style.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
