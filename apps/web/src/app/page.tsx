'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  TrendingUp,
  Target,
  Flame,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  Cpu,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Terminal,
  FileCheck2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const progressHistoryData = {
  '7 Days': [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 74 },
    { day: 'Wed', score: 73 },
    { day: 'Thu', score: 76 },
    { day: 'Fri', score: 75 },
    { day: 'Sat', score: 78 },
    { day: 'Sun', score: 78 },
  ],
  '30 Days': [
    { day: 'W1', score: 68 },
    { day: 'W2', score: 71 },
    { day: 'W3', score: 75 },
    { day: 'W4', score: 78 },
  ],
};

const topicMasteryList = [
  { id: 'dp', topic: 'Dynamic Programming', percentage: 48 },
  { id: 'os', topic: 'Operating Systems', percentage: 62 },
  { id: 'cn', topic: 'Computer Networks', percentage: 71 },
  { id: 'dbms', topic: 'DBMS', percentage: 78 },
  { id: 'ds', topic: 'Data Structures', percentage: 84 },
];

const knowledgeGapMatrix = [
  { topic: 'Arrays', concept: 92, application: 86, problemSolving: 68 },
  { topic: 'Trees', concept: 80, application: 61, problemSolving: 42 },
  { topic: 'Graphs', concept: 63, application: 47, problemSolving: 39 },
  { topic: 'Dynamic Programming', concept: 38, application: 31, problemSolving: 25 },
];

import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

export default function CLIASHomePage() {
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';
  const { theme, toggleTheme } = useTheme();
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'adaptive' | 'faculty'>('dashboard');
  const [timeframe, setTimeframe] = useState<'7 Days' | '30 Days'>('7 Days');
  const [selectedOption, setSelectedOption] = useState<number | null>(1); // Option B (Queue)
  const [assessmentFeedback, setAssessmentFeedback] = useState(false);

  const chartData = progressHistoryData[timeframe];

  const handleSelectOptionInPreview = (idx: number) => {
    setSelectedOption(idx);
    setAssessmentFeedback(true);
    setTimeout(() => {
      setAssessmentFeedback(false);
    }, 3000);
  };

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold';
    if (score >= 60) return 'bg-blue-50/80 text-blue-900 border-blue-100';
    if (score >= 40) return 'bg-amber-50 text-amber-900 border-amber-100';
    return 'bg-red-50 text-red-800 border-red-100 font-semibold';
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-blue-500/20 selection:text-blue-500">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[580px] bg-gradient-to-b from-blue-500/20 via-indigo-500/15 to-transparent blur-3xl rounded-full dark:from-blue-600/25 dark:via-purple-600/15" />
        <div className="absolute top-96 -left-48 w-96 h-96 bg-sky-400/10 dark:bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute top-80 -right-48 w-96 h-96 bg-purple-500/10 dark:bg-violet-600/15 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-grid-overlay opacity-80" />
      </div>

      {/* 1. Header Navigation */}
      <header className="bg-white/85 dark:bg-[#0a0f1d]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">CLIAS</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {universityName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                Learning Intelligence &amp; Adaptive Assessment
              </p>
            </div>
          </div>

          {/* Quick Portal Links & Auth */}
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="hidden md:inline-flex text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 transition"
            >
              Student Portal
            </Link>
            <Link
              href="/faculty/dashboard"
              className="hidden md:inline-flex text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 transition"
            >
              Faculty Intelligence
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block" />
            <Link
              href="/auth/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition shadow-xs"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg transition shadow-md shadow-blue-500/20"
            >
              Student Registration
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 sm:pt-20 pb-12 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-xs backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span>Continuous Knowledge Modeling &bull; Institutional Assessment System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.18] max-w-4xl mx-auto text-slate-900 dark:text-white">
          AI-Powered Student{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
            Learning Intelligence
          </span>
          <br className="hidden sm:inline" /> &amp; Adaptive Assessment
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 mt-5 max-w-2xl mx-auto leading-relaxed">
          CLIAS tracks student practice interactions to continuously evolve a dynamic topic mastery profile — identifying knowledge gaps, adapting assessment difficulty, and providing actionable remedial recommendations.
        </p>

        {/* Primary Action Row */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition"
          >
            <span>Launch Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/faculty/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs backdrop-blur-md active:scale-[0.98] transition"
          >
            <span>Faculty Intelligence View</span>
          </Link>
        </div>
      </section>

      {/* 3. The 4 Pedagogical Pillars */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs hover:shadow-md transition">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">1. What Practiced?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Granular interaction logging, time-on-question, difficulty calibration, and continuous streaks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs hover:shadow-md transition">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">2. What Learned?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              BKT &amp; IRT knowledge curves modeling true conceptual retention over time rather than static marks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs hover:shadow-md transition">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">3. Where Weak?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Knowledge gap matrix isolating subtopic misconceptions across concept, application, and problem solving.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs hover:shadow-md transition">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">4. What Next?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Targeted study plans, remedial drills, and adaptive question selection calibrated to student readiness.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Live Platform Intelligence Showcase (Interactive Preview) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white/85 dark:bg-[#0c1220]/85 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/50 backdrop-blur-xl">
          {/* Showcase Switcher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Live Platform Preview
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Academic Year 2026-27
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Explore The Learning Intelligence Engine
              </h2>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
              <button
                onClick={() => setPreviewTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  previewTab === 'dashboard'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Student Dashboard
              </button>
              <button
                onClick={() => setPreviewTab('adaptive')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  previewTab === 'adaptive'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Adaptive Assessment
              </button>
              <button
                onClick={() => setPreviewTab('faculty')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  previewTab === 'faculty'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Class Intelligence
              </button>
            </div>
          </div>

          {/* TAB 1: Student Dashboard Preview */}
          {previewTab === 'dashboard' && (
            <div className="pt-6 space-y-6 animate-fadeIn">
              {/* Top Compact Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Learning Mastery</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">78%</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+3.4%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Assessment Accuracy</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">84%</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">last 10 tests</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">High conceptual consistency</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Assessments Completed</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">12</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">2 this week</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Target: 4 monthly</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Current Streak</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">6 days</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">+1 day to weekly goal</p>
                </div>
              </div>

              {/* Progress Chart & Topic Mastery */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#10172a]/60 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Learning Progress</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Performance trajectory over time</p>
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => setTimeframe('7 Days')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          timeframe === '7 Days' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => setTimeframe('30 Days')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          timeframe === '30 Days' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        30 Days
                      </button>
                    </div>
                  </div>

                  <div className="h-52 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#E5E7EB'} />
                        <XAxis dataKey="day" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[50, 100]} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#FFFFFF',
                            borderColor: theme === 'dark' ? '#334155' : '#E5E7EB',
                            borderRadius: '10px',
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            fontSize: '11px',
                          }}
                          formatter={(v: any) => [`${v}%`, 'Mastery']}
                        />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/70 dark:border-slate-800 text-xs text-center">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Study time</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">28.5 hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Questions attempted</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">342</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Average accuracy</span>
                      <strong className="text-slate-900 dark:text-white font-semibold">84%</strong>
                    </div>
                  </div>
                </div>

                {/* Topic Mastery */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#10172a]/60 backdrop-blur-md space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Topic Mastery</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Core Modules</span>
                  </div>

                  {topicMasteryList.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.topic}</span>
                        <span
                          className={`font-semibold ${
                            item.percentage < 50
                              ? 'text-amber-500'
                              : item.percentage >= 80
                              ? 'text-emerald-500'
                              : 'text-blue-500 dark:text-blue-400'
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.percentage >= 80
                              ? 'bg-emerald-500'
                              : item.percentage >= 65
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 text-xs">
                    <Link
                      href="/student/dashboard"
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1"
                    >
                      <span>View all topics &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Knowledge Gap Table */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#10172a]/60 backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Knowledge Gaps</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Subtopic cognitive diagnostics matrix</p>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    ✦ Triage Active
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="pb-2 font-medium">Topic</th>
                        <th className="pb-2 text-center font-medium">Concept</th>
                        <th className="pb-2 text-center font-medium">Application</th>
                        <th className="pb-2 text-center font-medium">Problem Solving</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {knowledgeGapMatrix.map((row) => (
                        <tr key={row.topic}>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{row.topic}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded-md border text-[11px] font-medium ${getHeatmapColor(row.concept)}`}>
                              {row.concept}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded-md border text-[11px] font-medium ${getHeatmapColor(row.application)}`}>
                              {row.application}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded-md border text-[11px] font-medium ${getHeatmapColor(row.problemSolving)}`}>
                              {row.problemSolving}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Adaptive Assessment Preview */}
          {previewTab === 'adaptive' && (
            <div className="pt-6 space-y-6 max-w-3xl mx-auto animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Structures Assessment</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Adaptive Question Calibration Mode</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Progress</span>
                    <strong className="text-slate-900 dark:text-white">Question 8 of 20</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Timer</span>
                    <strong className="font-mono text-slate-900 dark:text-white">07:42</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Difficulty</span>
                    <span className="inline-block bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                      Medium
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Adjusted Banner */}
              {assessmentFeedback && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✦</span>
                    <span>
                      <strong>Assessment adjusted:</strong> Your next question has been selected based on your recent performance.
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-blue-500/25">
                    Calibrated
                  </span>
                </div>
              )}

              {/* Question & Options */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#10172a]/60 backdrop-blur-md space-y-4">
                <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  Which data structure is most suitable for implementing a BFS traversal?
                </p>

                <div className="space-y-2.5 pt-2">
                  {['Stack', 'Queue', 'Heap', 'Linked List'].map((opt, idx) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectOptionInPreview(idx)}
                      className={`w-full p-3.5 rounded-xl border text-xs font-medium text-left flex items-center gap-3 transition-all ${
                        selectedOption === idx
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition ${
                          selectedOption === idx
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    Previous
                  </button>
                  <Link
                    href="/student/assessments"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-500/20"
                  >
                    Take Full Adaptive Exam &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Faculty Intelligence Preview */}
          {previewTab === 'faculty' && (
            <div className="pt-6 space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Enrolled Cohort</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">64 Students</div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">CS301 &bull; Section A</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Cohort Mastery</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">74% Average</div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Passing benchmark met</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Upward Trajectory</span>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">41 Improving</div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">+5.4% average growth</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#12192c]/80 border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Intervention Required</span>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">12 Need Attention</div>
                  <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold">&lt;55% in recent tests</span>
                </div>
              </div>

              {/* Class Learning Insights Cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Learning Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#12192c]/70 space-y-1">
                    <span className="font-semibold text-red-600 dark:text-red-400 block">Misconception Alert</span>
                    <p className="text-slate-700 dark:text-slate-300">23 students are struggling with Dynamic Programming.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#12192c]/70 space-y-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block">Trend Shift</span>
                    <p className="text-slate-700 dark:text-slate-300">Average performance in Graph Algorithms decreased by 8% this week.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#12192c]/70 space-y-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">Intervention Impact</span>
                    <p className="text-slate-700 dark:text-slate-300">Students who completed the recommended practice set improved assessment accuracy.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <Link
                  href="/faculty/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open Full Faculty Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Direct Role Access Directory */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Institutional Role Gateways
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Access CLIAS by Department Designation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test accounts configured with default credential: <code className="font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">clias123</code>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 dark:hover:border-blue-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">STUDENT</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Adaptive tests &amp; mastery</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">FACULTY</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Cohort intelligence &amp; drills</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/80 dark:hover:border-amber-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">COUNSELLOR</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">At-risk student tracking</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/80 dark:hover:border-sky-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">HOD</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Department curriculum metrics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/80 dark:hover:border-indigo-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">DEAN / HEAD</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Institutional analytics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0e1526]/80 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/80 dark:hover:border-rose-500/80 hover:shadow-md transition-all text-center shadow-xs group backdrop-blur-md"
          >
            <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">SUPER ADMIN</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">System configuration</p>
          </Link>
        </div>
      </section>

      {/* 6. Institutional Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>
          CLIAS &copy; 2026 {universityName} &bull; CHARUSAT Learning Intelligence &amp; Assessment System
        </p>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Institutional Accreditation A+</span>
          <span>&bull;</span>
          <span>Continuous Knowledge Modeling Framework</span>
        </div>
      </footer>
    </div>
  );
}
