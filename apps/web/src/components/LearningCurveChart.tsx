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

interface CurvePoint {
  recordedAt: string | Date;
  masteryScore: number;
  topicName?: string;
  courseCode?: string;
}

interface LearningCurveChartProps {
  data: CurvePoint[];
  topicFilter?: string;
}

export function LearningCurveChart({ data }: LearningCurveChartProps) {
  const chartData = useMemo(() => {
    // 1. If data is provided, group attempts by calendar date (YYYY-MM-DD)
    const attemptsByDay = new Map<string, { latestMastery: number; topics: Set<string>; course?: string }>();
    let earliestDate: Date | null = null;

    if (Array.isArray(data) && data.length > 0) {
      // Sort ascending by recordedAt
      const sorted = [...data].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );

      for (const item of sorted) {
        const d = new Date(item.recordedAt);
        if (isNaN(d.getTime())) continue;

        if (!earliestDate || d < earliestDate) {
          earliestDate = d;
        }

        const dateKey = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const existing = attemptsByDay.get(dateKey);
        const score = Math.round(item.masteryScore);

        if (existing) {
          existing.latestMastery = score;
          if (item.topicName) existing.topics.add(item.topicName);
          if (item.courseCode) existing.course = item.courseCode;
        } else {
          attemptsByDay.set(dateKey, {
            latestMastery: score,
            topics: new Set(item.topicName ? [item.topicName] : []),
            course: item.courseCode,
          });
        }
      }
    }

    // 2. Build continuous day-wise timeline:
    // At minimum last 7 days ending today (or from earliest activity date up to today)
    const now = new Date();
    const minDays = 7;
    let daysCount = minDays;

    if (earliestDate) {
      const diffTime = Math.abs(now.getTime() - earliestDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      daysCount = Math.max(minDays, Math.min(diffDays, 30)); // Cap at 30 days for clarity
    }

    const points = [];
    let lastKnownMastery = 0;
    let hasHadFirstActivity = false;

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const dateKey = targetDate.toISOString().slice(0, 10);
      const dateLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDateLabel = targetDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const dayActivity = attemptsByDay.get(dateKey);

      if (dayActivity) {
        hasHadFirstActivity = true;
        lastKnownMastery = dayActivity.latestMastery;
        const topicsList = Array.from(dayActivity.topics);
        points.push({
          date: dateLabel,
          fullDate: fullDateLabel,
          mastery: dayActivity.latestMastery,
          topic: topicsList.length > 0 ? topicsList.join(', ') : 'Practice Session',
          course: dayActivity.course || '',
          hasActivity: true,
        });
      } else {
        // No activity on this day
        if (hasHadFirstActivity) {
          // If the student already started on an earlier day, keep their current level
          points.push({
            date: dateLabel,
            fullDate: fullDateLabel,
            mastery: lastKnownMastery,
            topic: 'Mastery maintained',
            course: '',
            hasActivity: false,
          });
        } else {
          // For a new user or days prior to any activity: mastery is 0 (straight line on X axis)
          points.push({
            date: dateLabel,
            fullDate: fullDateLabel,
            mastery: 0,
            topic: 'No activity logged',
            course: '',
            hasActivity: false,
          });
        }
      }
    }

    return points;
  }, [data]);

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
            dataKey="date"
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
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                    <p className="font-bold text-slate-300">{p.fullDate}</p>
                    <p className="text-white flex items-center justify-between gap-4">
                      <span className="text-slate-400">Mastery Score:</span>
                      <span className="font-extrabold text-indigo-400 text-sm">{p.mastery}%</span>
                    </p>
                    <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
                      {p.hasActivity ? (
                        <span className="text-emerald-400">● {p.topic}</span>
                      ) : (
                        <span className="text-slate-500 italic">No practice activity on this day</span>
                      )}
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
            dot={{ r: 3, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
            fillOpacity={1}
            fill="url(#curveGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
