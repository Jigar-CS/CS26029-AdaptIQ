'use client';

import React from 'react';
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
  recordedAt: string;
  masteryScore: number;
  topicName?: string;
  courseCode?: string;
}

interface LearningCurveChartProps {
  data: CurvePoint[];
  topicFilter?: string;
}

export function LearningCurveChart({ data }: LearningCurveChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p className="text-sm font-medium">No practice history recorded yet.</p>
        <p className="text-xs text-slate-400 mt-1">Start a practice session to build your dynamic learning curve!</p>
      </div>
    );
  }

  // Format data for Recharts
  const formattedData = data.map((item) => {
    const date = new Date(item.recordedAt);
    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: dateLabel,
      fullDate: date.toLocaleString(),
      mastery: Math.round(item.masteryScore),
      topic: item.topicName || 'Topic',
      course: item.courseCode || '',
    };
  });

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
                    <p className="font-bold text-indigo-300">{p.topic}</p>
                    <p className="text-slate-300 mt-0.5">Mastery: <span className="font-bold text-white">{p.mastery}%</span></p>
                    <p className="text-[10px] text-slate-400 mt-1">{p.fullDate}</p>
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
            fillOpacity={1}
            fill="url(#curveGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
