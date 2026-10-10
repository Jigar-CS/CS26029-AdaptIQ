'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

export interface CurvePoint {
  id?: string;
  recordedAt: string | Date;
  masteryScore: number;
  rawScore?: number;
  topicName?: string;
  courseCode?: string;
  source?: 'PRACTICE' | 'ASSESSMENT' | string;
  reason?: string;
  practiceMastery?: number;
  assessmentMastery?: number;
}

interface LearningCurveChartProps {
  data: CurvePoint[];
  topicFilter?: string;
  sourceFilter?: string;
  isLoading?: boolean;
}

export function LearningCurveChart({
  data,
  sourceFilter = 'ALL',
  isLoading = false,
}: LearningCurveChartProps) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Sort ascending by recordedAt strictly chronologically
    const sorted = [...data]
      .filter((item) => item && item.recordedAt)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    if (sorted.length === 0) {
      return [];
    }

    // Detect if multiple attempts occur on the same day
    const dayCounts = new Map<string, number>();
    for (const item of sorted) {
      const d = new Date(item.recordedAt);
      if (!isNaN(d.getTime())) {
        const dayKey = d.toISOString().slice(0, 10);
        dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
      }
    }

    const daySeenCounts = new Map<string, number>();

    return sorted.map((item, idx) => {
      const d = new Date(item.recordedAt);
      const isDateValid = !isNaN(d.getTime());
      const dayKey = isDateValid ? d.toISOString().slice(0, 10) : `item-${idx}`;
      const totalOnDay = dayCounts.get(dayKey) || 1;
      const seenSoFar = (daySeenCounts.get(dayKey) || 0) + 1;
      daySeenCounts.set(dayKey, seenSoFar);

      const baseDateLabel = isDateValid
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `Point ${idx + 1}`;

      const timeLabel = isDateValid
        ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';

      const displayDate =
        totalOnDay > 1 && isDateValid
          ? `${baseDateLabel} ${timeLabel}`
          : baseDateLabel;

      const fullDateLabel = isDateValid
        ? d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Milestone';

      const resolvedSource =
        item.source ||
        (item.reason === 'TEST_RESULT' || item.reason === 'REASSESSMENT'
          ? 'ASSESSMENT'
          : 'PRACTICE');

      return {
        id: item.id || `pt-${idx}`,
        displayDate,
        fullDate: fullDateLabel,
        mastery: Math.round(item.masteryScore * 10) / 10,
        rawScore: typeof item.rawScore === 'number' ? Math.round(item.rawScore * 10) / 10 : undefined,
        source: resolvedSource,
        topic: item.topicName || 'General Topic',
        course: item.courseCode || '',
        practiceMastery: item.practiceMastery,
        assessmentMastery: item.assessmentMastery,
      };
    });
  }, [data]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-72 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Calibrating Knowledge Curve...
        </div>
      </div>
    );
  }

  // Insufficient data state (without inventing artificial trend data)
  if (chartData.length === 0) {
    const sourceLabel =
      sourceFilter === 'PRACTICE'
        ? 'adaptive practice'
        : sourceFilter === 'ASSESSMENT'
        ? 'formal assessment'
        : 'learning';

    return (
      <div className="w-full h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-2.5">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Insufficient Historical Data
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
          No {sourceLabel} attempts have been logged for this selection yet. Complete practice sessions or tests to calibrate your progressive learning trajectory.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
          <XAxis
            dataKey="displayDate"
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload;
                const isAssess = p.source === 'ASSESSMENT';

                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <p className="font-semibold text-slate-300 text-[11px]">{p.fullDate}</p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isAssess
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {isAssess ? 'Assessment' : 'Practice'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-white flex items-center justify-between gap-4">
                        <span className="text-slate-400">Smoothed Mastery:</span>
                        <span className="font-extrabold text-indigo-400 text-sm">{p.mastery}%</span>
                      </div>
                      {typeof p.rawScore === 'number' && (
                        <div className="text-white flex items-center justify-between gap-4 text-[11px]">
                          <span className="text-slate-400">Attempt Score:</span>
                          <span className="font-medium text-slate-200">{p.rawScore}%</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-1 mt-1 flex items-center gap-1.5">
                      <span className="text-emerald-400">●</span>
                      <span className="truncate">{p.topic}{p.course ? ` (${p.course})` : ''}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="mastery"
            stroke="#4f46e5"
            strokeWidth={3}
            dot={{ r: chartData.length === 1 ? 5 : 3, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
            fillOpacity={1}
            fill="url(#curveGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
