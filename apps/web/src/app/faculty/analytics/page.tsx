'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  BrainCircuit,
  Award,
  BookOpen,
  CheckCircle2,
  Sparkles,
  BarChart2,
  FileSpreadsheet,
  Download,
  Send,
  AlertCircle,
} from 'lucide-react';

interface TopicAnalytics {
  name: string;
  avgMastery: number;
  attemptCount: number;
  struggleRate: number;
  status: 'HEALTHY' | 'NEEDS_REINFORCEMENT' | 'CRITICAL_DEFICIENCY';
  topMisconception: string;
}

export default function FacultyClassAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedCourse, setSelectedCourse] = useState('CS301');
  const [selectedDivision, setSelectedDivision] = useState('Division A');

  const topicAnalytics: TopicAnalytics[] = [
    {
      name: 'Arrays & Two Pointers',
      avgMastery: 88,
      attemptCount: 320,
      struggleRate: 12,
      status: 'HEALTHY',
      topMisconception: 'Off-by-one boundary index on sliding window shrink',
    },
    {
      name: 'Stacks & Monotonic Queues',
      avgMastery: 81,
      attemptCount: 260,
      struggleRate: 18,
      status: 'HEALTHY',
      topMisconception: 'Popping order inversion during prefix-to-postfix evaluation',
    },
    {
      name: 'Binary Search Trees (BST)',
      avgMastery: 72,
      attemptCount: 290,
      struggleRate: 28,
      status: 'HEALTHY',
      topMisconception: 'Confusing predecessor with minimum key in right subtree',
    },
    {
      name: 'AVL Tree Self-Balancing Invariants',
      avgMastery: 56,
      attemptCount: 195,
      struggleRate: 46,
      status: 'NEEDS_REINFORCEMENT',
      topMisconception: 'Applying single rotation when zig-zag imbalance requires double rotation',
    },
    {
      name: 'Dynamic Programming (Memoization)',
      avgMastery: 38,
      attemptCount: 210,
      struggleRate: 64,
      status: 'CRITICAL_DEFICIENCY',
      topMisconception: 'Failing to identify state recurrence overlapping subproblems',
    },
    {
      name: 'Graph Traversal (BFS / DFS)',
      avgMastery: 69,
      attemptCount: 180,
      struggleRate: 31,
      status: 'HEALTHY',
      topMisconception: 'Omitting cycle detection in directed graphs',
    },
  ];

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
    }
  }, [user, authLoading]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'HEALTHY':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      case 'NEEDS_REINFORCEMENT':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      default:
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    }
  };

  const handleSendNudge = () => {
    alert('Automated remediation practice session dispatched to 14 students struggling with Dynamic Programming.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Curriculum & Class Learning Intelligence Analytics"
          subtitle="Longitudinal mastery tracking, psychometric misconception heatmaps & student distribution"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Class Performance Intelligence
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {selectedCourse}: Data Structures
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Department of Computer Science &amp; Engineering • CSPIT Semester 5 • {selectedDivision}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendNudge}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Topic Remediation Nudge</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Enrolled Cohort"
              value="64"
              subtitle="Division A Students"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Class Avg Mastery"
              value="71.4%"
              subtitle="EWMA Knowledge Curve"
              icon={TrendingUp}
              trend={{ value: '8.2% vs last test', isPositive: true }}
              color="emerald"
            />
            <MetricCard
              title="Misconception Flags"
              value="4 Topics"
              subtitle="Intervention Recommended"
              icon={AlertTriangle}
              color="rose"
            />
            <MetricCard
              title="Practice Adherence"
              value="88.2%"
              subtitle="Weekly Active Students"
              icon={CheckCircle2}
              color="blue"
            />
          </div>

          {/* Student Mastery Quartile Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cohort Knowledge Distribution (Quartiles)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Breakdown of 64 enrolled students grouped by current estimated knowledge ability
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                  Top Mastery (80-100%)
                </span>
                <span className="text-2xl font-black text-emerald-950 dark:text-white mt-1 block">
                  24 Students (37.5%)
                </span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Ready for advanced competitive coding</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase block">
                  Proficient (60-80%)
                </span>
                <span className="text-2xl font-black text-blue-950 dark:text-white mt-1 block">
                  26 Students (40.6%)
                </span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">Consistent knowledge baseline met</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                  Developing (40-60%)
                </span>
                <span className="text-2xl font-black text-amber-950 dark:text-white mt-1 block">
                  10 Students (15.6%)
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Targeted practice needed in Trees</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase block">
                  At-Risk (&lt; 40%)
                </span>
                <span className="text-2xl font-black text-rose-950 dark:text-white mt-1 block">
                  4 Students (6.3%)
                </span>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">Counsellor alerts initiated</p>
              </div>
            </div>
          </div>

          {/* Topic-by-Topic Mastery Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Curriculum Topic Mastery &amp; Struggle Heatmap
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identifies conceptual bottlenecks and recurring distractor trap patterns
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Curriculum Topic</th>
                    <th className="p-4">Cohort Mastery</th>
                    <th className="p-4">Total Attempts</th>
                    <th className="p-4">Struggle Rate</th>
                    <th className="p-4">Health Status</th>
                    <th className="p-4">Primary Misconception Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {topicAnalytics.map((t) => (
                    <tr key={t.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white w-10">{t.avgMastery}%</span>
                          <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.avgMastery >= 75
                                  ? 'bg-emerald-500'
                                  : t.avgMastery >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${t.avgMastery}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{t.attemptCount}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{t.struggleRate}%</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadge(t.status)}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                        {t.topMisconception}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
