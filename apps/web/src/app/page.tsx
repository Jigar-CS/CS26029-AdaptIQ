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
    <div className="min-h-screen bg-[#F7F7F3] dark:bg-slate-950 text-[#111827] dark:text-slate-100 transition-colors duration-200 selection:bg-[#EFF6FF] selection:text-[#2563EB]">
      {/* 1. Header Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#172554] flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#172554] dark:text-white">CLIAS</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#F2F3EF] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-700">
                  {universityName}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium leading-none">
                Learning Intelligence &amp; Adaptive Assessment
              </p>
            </div>
          </div>

          {/* Quick Portal Links & Auth */}
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="hidden md:inline-flex text-xs font-semibold text-[#64748B] dark:text-slate-300 hover:text-[#111827] dark:hover:text-white px-3 py-1.5 transition"
            >
              Student Portal
            </Link>
            <Link
              href="/faculty/dashboard"
              className="hidden md:inline-flex text-xs font-semibold text-[#64748B] dark:text-slate-300 hover:text-[#111827] dark:hover:text-white px-3 py-1.5 transition"
            >
              Faculty Intelligence
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <div className="h-4 w-[1px] bg-[#E5E7EB] dark:bg-slate-700 hidden md:block" />
            <Link
              href="/auth/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-[#111827] dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-[#F2F3EF] dark:hover:bg-slate-700 border border-[#E5E7EB] dark:border-slate-700 rounded-lg transition shadow-xs"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition shadow-xs"
            >
              Student Registration
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-semibold mb-6">
          <span>✦</span>
          <span>Continuous Knowledge Modeling &bull; Institutional Assessment System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111827] leading-tight max-w-4xl mx-auto">
          AI-Powered Student Learning Intelligence &amp; Adaptive Assessment
        </h1>

        <p className="text-sm sm:text-base text-[#64748B] mt-5 max-w-2xl mx-auto leading-relaxed">
          CLIAS tracks student practice interactions to continuously evolve a dynamic topic mastery profile — identifying knowledge gaps, adapting assessment difficulty, and providing actionable remedial recommendations.
        </p>

        {/* Primary Action Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-xs transition"
          >
            <span>Launch Student Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/faculty/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#111827] bg-white hover:bg-[#F2F3EF] border border-[#E5E7EB] rounded-lg shadow-xs transition"
          >
            <span>Faculty Intelligence View</span>
          </Link>
        </div>
      </section>

      {/* 3. The 4 Pedagogical Pillars */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="academic-card p-5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">1. What Practiced?</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Granular interaction logging, time-on-question, difficulty calibration, and continuous streaks.
            </p>
          </div>

          <div className="academic-card p-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16A34A] flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">2. What Learned?</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              BKT &amp; IRT knowledge curves modeling true conceptual retention over time rather than static marks.
            </p>
          </div>

          <div className="academic-card p-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">3. Where Weak?</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Knowledge gap matrix isolating subtopic misconceptions across concept, application, and problem solving.
            </p>
          </div>

          <div className="academic-card p-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#172554] flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">4. What Next?</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Targeted study plans, remedial drills, and adaptive question selection calibrated to student readiness.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Live Platform Intelligence Showcase (Interactive Preview) */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Showcase Switcher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E7EB] gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                  Live Platform Preview
                </span>
                <span className="text-[11px] text-[#64748B] bg-[#F2F3EF] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  Academic Year 2026-27
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#111827] mt-1">
                Explore The Learning Intelligence Engine
              </h2>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center bg-[#F2F3EF] p-1 rounded-lg border border-[#E5E7EB] text-xs">
              <button
                onClick={() => setPreviewTab('dashboard')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  previewTab === 'dashboard'
                    ? 'bg-white text-[#111827] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Student Dashboard
              </button>
              <button
                onClick={() => setPreviewTab('adaptive')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  previewTab === 'adaptive'
                    ? 'bg-white text-[#111827] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Adaptive Assessment
              </button>
              <button
                onClick={() => setPreviewTab('faculty')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  previewTab === 'faculty'
                    ? 'bg-white text-[#111827] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#64748B] hover:text-[#111827]'
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
                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Learning Mastery</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#111827]">78%</span>
                    <span className="text-xs font-semibold text-[#16A34A]">+3.4%</span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Assessment Accuracy</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#111827]">84%</span>
                    <span className="text-xs text-[#64748B]">last 10 tests</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-2">High conceptual consistency</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Assessments Completed</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#111827]">12</span>
                    <span className="text-xs text-[#2563EB]">2 this week</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-2">Target: 4 monthly</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Current Streak</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#111827]">6 days</span>
                    <span className="text-xs text-[#16A34A]">Active</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-2">+1 day to weekly goal</p>
                </div>
              </div>

              {/* Progress Chart & Topic Mastery */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-xl border border-[#E5E7EB] bg-white">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">Learning Progress</h3>
                      <p className="text-xs text-[#64748B]">Performance trajectory over time</p>
                    </div>
                    <div className="flex items-center bg-[#F2F3EF] p-0.5 rounded border border-[#E5E7EB] text-xs">
                      <button
                        onClick={() => setTimeframe('7 Days')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          timeframe === '7 Days' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                        }`}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => setTimeframe('30 Days')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          timeframe === '30 Days' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#64748B]'
                        }`}
                      >
                        30 Days
                      </button>
                    </div>
                  </div>

                  <div className="h-52 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[50, 100]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '11px' }}
                          formatter={(v: any) => [`${v}%`, 'Mastery']}
                        />
                        <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E5E7EB] text-xs text-center">
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Study time</span>
                      <strong className="text-[#111827]">28.5 hrs</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Questions attempted</span>
                      <strong className="text-[#111827]">342</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Average accuracy</span>
                      <strong className="text-[#111827]">84%</strong>
                    </div>
                  </div>
                </div>

                {/* Topic Mastery */}
                <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                    <h3 className="text-sm font-bold text-[#111827]">Topic Mastery</h3>
                    <span className="text-xs text-[#64748B]">Core Modules</span>
                  </div>

                  {topicMasteryList.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#111827]">{item.topic}</span>
                        <span
                          className={`font-semibold ${
                            item.percentage < 50
                              ? 'text-[#D97706]'
                              : item.percentage >= 80
                              ? 'text-[#16A34A]'
                              : 'text-[#111827]'
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-[#F2F3EF] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.percentage >= 80
                              ? 'bg-[#16A34A]'
                              : item.percentage >= 65
                              ? 'bg-[#2563EB]'
                              : 'bg-[#D97706]'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 text-xs">
                    <Link
                      href="/student/dashboard"
                      className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
                    >
                      <span>View all topics &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Knowledge Gap Table */}
              <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Knowledge Gaps</h3>
                    <p className="text-xs text-[#64748B]">Subtopic cognitive diagnostics matrix</p>
                  </div>
                  <span className="text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                    ✦ Triage Active
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[#64748B]">
                        <th className="pb-2 font-medium">Topic</th>
                        <th className="pb-2 text-center font-medium">Concept</th>
                        <th className="pb-2 text-center font-medium">Application</th>
                        <th className="pb-2 text-center font-medium">Problem Solving</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {knowledgeGapMatrix.map((row) => (
                        <tr key={row.topic}>
                          <td className="py-2.5 font-medium text-[#111827]">{row.topic}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded border ${getHeatmapColor(row.concept)}`}>
                              {row.concept}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded border ${getHeatmapColor(row.application)}`}>
                              {row.application}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 rounded border ${getHeatmapColor(row.problemSolving)}`}>
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
              <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Data Structures Assessment</h3>
                  <span className="text-xs text-[#64748B]">Adaptive Question Calibration Mode</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Progress</span>
                    <strong className="text-[#111827]">Question 8 of 20</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-[#E5E7EB]" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Timer</span>
                    <strong className="font-mono text-[#111827]">07:42</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-[#E5E7EB]" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Difficulty</span>
                    <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                      Medium
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Adjusted Banner */}
              {assessmentFeedback && (
                <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2563EB] font-bold">✦</span>
                    <span>
                      <strong>Assessment adjusted:</strong> Your next question has been selected based on your recent performance.
                    </span>
                  </div>
                  <span className="text-[10px] text-[#2563EB] bg-white px-2 py-0.5 rounded border border-[#BFDBFE]">
                    Calibrated
                  </span>
                </div>
              )}

              {/* Question & Options */}
              <div className="p-6 rounded-xl border border-[#E5E7EB] bg-white space-y-4">
                <p className="text-base font-semibold text-[#111827] leading-relaxed">
                  Which data structure is most suitable for implementing a BFS traversal?
                </p>

                <div className="space-y-2.5 pt-2">
                  {['Stack', 'Queue', 'Heap', 'Linked List'].map((opt, idx) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectOptionInPreview(idx)}
                      className={`w-full p-3.5 rounded-lg border text-xs font-medium text-left flex items-center gap-3 transition-all ${
                        selectedOption === idx
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#172554] shadow-xs'
                          : 'border-[#E5E7EB] bg-white text-[#111827] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                          selectedOption === idx
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'border-[#CBD5E1] text-[#64748B]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
                  <button className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#64748B] hover:text-[#111827]">
                    Previous
                  </button>
                  <Link
                    href="/student/assessments"
                    className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-xs"
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
                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Enrolled Cohort</span>
                  <div className="text-2xl font-bold text-[#111827] mt-1">64 Students</div>
                  <span className="text-[11px] text-[#64748B]">CS301 &bull; Section A</span>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Cohort Mastery</span>
                  <div className="text-2xl font-bold text-[#111827] mt-1">74% Average</div>
                  <span className="text-[11px] text-[#16A34A] font-semibold">Passing benchmark met</span>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Upward Trajectory</span>
                  <div className="text-2xl font-bold text-[#16A34A] mt-1">41 Improving</div>
                  <span className="text-[11px] text-[#64748B]">+5.4% average growth</span>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F7F3] border border-[#E5E7EB]">
                  <span className="text-xs text-[#64748B]">Intervention Required</span>
                  <div className="text-2xl font-bold text-[#DC2626] mt-1">12 Need Attention</div>
                  <span className="text-[11px] text-red-700 font-semibold">&lt;55% in recent tests</span>
                </div>
              </div>

              {/* Class Learning Insights Cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#111827]">Class Learning Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#F7F7F3] space-y-1">
                    <span className="font-semibold text-[#DC2626] block">Misconception Alert</span>
                    <p className="text-[#111827]">23 students are struggling with Dynamic Programming.</p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#F7F7F3] space-y-1">
                    <span className="font-semibold text-[#D97706] block">Trend Shift</span>
                    <p className="text-[#111827]">Average performance in Graph Algorithms decreased by 8% this week.</p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-[#E5E7EB] bg-[#F7F7F3] space-y-1">
                    <span className="font-semibold text-[#16A34A] block">Intervention Impact</span>
                    <p className="text-[#111827]">Students who completed the recommended practice set improved assessment accuracy.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <Link
                  href="/faculty/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
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
      <section className="max-w-7xl mx-auto px-6 py-10 border-t border-[#E5E7EB]">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Institutional Role Gateways
          </span>
          <h2 className="text-xl font-bold text-[#111827] mt-1">
            Access CLIAS by Department Designation
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Test accounts configured with default credential: <code className="font-mono bg-[#F2F3EF] px-1.5 py-0.5 rounded text-[#111827]">clias123</code>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#2563EB] transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#2563EB] block mb-1">STUDENT</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">Adaptive tests &amp; mastery</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-emerald-500 transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#16A34A] block mb-1">FACULTY</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">Cohort intelligence &amp; drills</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-amber-500 transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#D97706] block mb-1">COUNSELLOR</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">At-risk student tracking</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-blue-900 transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#172554] block mb-1">HOD</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">Department curriculum metrics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-indigo-600 transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#4F46E5] block mb-1">DEAN / HEAD</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">Institutional analytics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-red-600 transition text-center shadow-xs group"
          >
            <span className="font-bold text-[#DC2626] block mb-1">SUPER ADMIN</span>
            <p className="text-[11px] text-[#64748B] group-hover:text-[#111827]">System configuration</p>
          </Link>
        </div>
      </section>

      {/* 6. Institutional Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-[#E5E7EB] text-center text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-4">
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
