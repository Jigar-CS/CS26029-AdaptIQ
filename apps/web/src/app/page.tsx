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
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 font-semibold';
    if (score >= 60) return 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40';
    if (score >= 40) return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40';
    return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40 font-semibold';
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#f5f0e8] dark:bg-[#0c1220] text-[#1a2540] dark:text-[#e8edf5] transition-colors duration-300 selection:bg-[#e05033]/20 selection:text-[#e05033]">
      {/* CARDIA / Gleam-spark Atlas Coordinate Grid Atmosphere */}
      <div className="absolute inset-0 pointer-events-none atlas-grid opacity-35 dark:opacity-20" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#e05033]/10 via-[#4a6fa5]/5 to-transparent blur-3xl rounded-full dark:from-[#e8604a]/15 dark:via-blue-950/10" />
        <div className="absolute top-96 -left-48 w-96 h-96 bg-[#4a6fa5]/10 dark:bg-[#6a90c5]/5 blur-3xl rounded-full" />
      </div>

      {/* 1. Header Navigation */}
      <header className="bg-[#faf7f2]/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-display font-black tracking-wider text-[#1a2540] dark:text-white uppercase">
                CLIAS<span className="text-[#e05033]">.</span>
              </span>
              <span className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[rgba(224,80,51,0.1)] text-[#e05033] border border-[rgba(224,80,51,0.3)]" style={{ borderRadius: 0 }}>
                {universityName}
              </span>
            </Link>
          </div>

          {/* Quick Portal Links & Auth */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-[#4a6fa5] dark:text-[#6a90c5] hover:text-[#1a2540] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] transition"
              style={{ borderRadius: 0 }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <div className="h-4 w-[1px] bg-[rgba(74,111,165,0.25)] hidden md:block" />
            <Link
              href="/auth/login"
              className="px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#1a2540] dark:text-slate-200 bg-[#faf7f2] dark:bg-[#121b30] hover:bg-[#ede8df] dark:hover:bg-slate-800 border border-[rgba(74,111,165,0.3)] transition shadow-2xs"
              style={{ borderRadius: 0 }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white bg-[#e05033] hover:bg-[#c93f25] transition shadow-sm"
              style={{ borderRadius: 0 }}
            >
              Register
            </Link>
          </div>
        </div>
      </header>
      {/* 2. Hero Section (Cardio + Gleam-spark Reference: Two-column, Anton Typography, 2D Radar Matrix) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 sm:pt-14 pb-14 border-b border-[rgba(74,111,165,0.25)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Big Condensed Typography & CTA */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black uppercase leading-[0.88] tracking-tight text-[#1a2540] dark:text-white select-none">
              <span className="block">LEARN</span>
              <span className="block text-[#e05033]">SMARTER</span>
              <span className="block">WITH CLIAS.</span>
            </h1>

            {/* Primary Action Row */}
            <div className="flex flex-wrap items-center gap-3.5 mt-8">
              <Link
                href="/student/dashboard"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white bg-[#e05033] hover:bg-[#c93f25] shadow-md shadow-red-600/20 active:scale-[0.98] transition cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                <span>Launch Student Portal →</span>
              </Link>
              <Link
                href="/faculty/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#1a2540] dark:text-slate-200 bg-[#faf7f2] dark:bg-[#121b30] hover:bg-[#ede8df] dark:hover:bg-slate-800 border border-[rgba(74,111,165,0.3)] shadow-xs active:scale-[0.98] transition"
                style={{ borderRadius: 0 }}
              >
                <span>Faculty Intelligence View</span>
              </Link>
            </div>
          </div>

          {/* Right Column: 2D Cognitive Matrix Radar Graphic (FIG. 01) */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            <div className="w-full max-w-[440px] aspect-square relative flex items-center justify-center p-4">

              {/* Concentric Technical Radar Circles (Pure 2D SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
                {/* Crosshair Axes */}
                <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
                <line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />

                {/* Radar Rings */}
                <circle cx="200" cy="200" r="170" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                <circle cx="200" cy="200" r="125" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="200" cy="200" r="75" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                <circle cx="200" cy="200" r="30" fill="none" stroke="#e05033" strokeOpacity="0.3" strokeWidth="1" />

                {/* Technical Node Connections */}
                <line x1="200" y1="200" x2="85" y2="105" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
                <line x1="200" y1="200" x2="315" y2="105" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
                <line x1="200" y1="200" x2="335" y2="260" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
                <line x1="200" y1="200" x2="75" y2="280" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
                <line x1="200" y1="200" x2="200" y2="350" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />

                {/* Node Target Rings */}
                <circle cx="85" cy="105" r="5" fill="#e05033" />
                <circle cx="85" cy="105" r="11" fill="none" stroke="#e05033" strokeOpacity="0.4" />

                <circle cx="315" cy="105" r="5" fill="#4a6fa5" />
                <circle cx="315" cy="105" r="11" fill="none" stroke="#4a6fa5" strokeOpacity="0.4" />

                <circle cx="335" cy="260" r="5" fill="#e05033" />
                <circle cx="335" cy="260" r="11" fill="none" stroke="#e05033" strokeOpacity="0.4" />

                <circle cx="75" cy="280" r="5" fill="#4a6fa5" />
                <circle cx="75" cy="280" r="11" fill="none" stroke="#4a6fa5" strokeOpacity="0.4" />

                <circle cx="200" cy="350" r="5" fill="#e05033" />
                <circle cx="200" cy="350" r="11" fill="none" stroke="#e05033" strokeOpacity="0.4" />
              </svg>

              {/* Center Core Node (CLIAS Engine) */}
              <div className="relative z-10 w-28 h-28 rounded-full bg-[#faf7f2] dark:bg-[#121b30] border-2 border-[#e05033] shadow-xl flex flex-col items-center justify-center p-2 text-center">
                <span className="font-display font-black text-2xl tracking-wider text-[#1a2540] dark:text-white leading-none">
                  CLIAS
                </span>
                <span className="font-mono text-[8px] uppercase font-bold text-[#e05033] tracking-tight mt-1">
                  CORE ENGINE
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e05033] mt-0.5 animate-ping" />
              </div>

              {/* Floating Topic Nodes with Monospace Labels */}
              <div className="absolute top-6 left-2 font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.3)] shadow-xs text-[#1a2540] dark:text-white" style={{ borderRadius: 0 }}>
                01 • ALGORITHMS
              </div>
              <div className="absolute top-6 right-2 font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.3)] shadow-xs text-[#1a2540] dark:text-white" style={{ borderRadius: 0 }}>
                02 • DATA STRUCT.
              </div>
              <div className="absolute bottom-24 -right-1 font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.3)] shadow-xs text-[#1a2540] dark:text-white" style={{ borderRadius: 0 }}>
                03 • SYSTEM ARCH.
              </div>
              <div className="absolute bottom-20 -left-1 font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.3)] shadow-xs text-[#1a2540] dark:text-white" style={{ borderRadius: 0 }}>
                04 • NEURAL &amp; AI
              </div>
              <div className="absolute bottom-1 font-mono text-[9px] uppercase font-bold px-2 py-0.5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.3)] shadow-xs text-[#1a2540] dark:text-white" style={{ borderRadius: 0 }}>
                05 • DATABASES
              </div>

              {/* Floating Telemetry Box (Cardio / Gleam-spark reference) */}
              <div className="absolute bottom-2 right-2 bg-[#faf7f2]/95 dark:bg-[#121b30]/95 backdrop-blur-md border border-[rgba(74,111,165,0.3)] p-2.5 shadow-lg font-mono text-left max-w-[170px] z-20" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase font-bold">
                  <span>VELOCITY</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+14.2%</span>
                </div>
                <div className="h-6 w-full my-1">
                  {/* Mini Sparkline SVG */}
                  <svg className="w-full h-full" viewBox="0 0 100 24" fill="none">
                    <path
                      d="M0 20 L20 16 L40 18 L60 11 L80 13 L100 4"
                      stroke="#e05033"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 20 L20 16 L40 18 L60 11 L80 13 L100 4 L100 24 L0 24 Z"
                      fill="#e05033"
                      fillOpacity="0.1"
                    />
                  </svg>
                </div>
                <div className="text-[8px] text-[#1a2540]/70 dark:text-slate-300 font-mono">
                  BKT θ = +1.42
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2.5 SECTION B: Telemetry & Diagnostic Metrics (Exact Cardio Website Pattern) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-b border-[rgba(74,111,165,0.25)] font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 text-xs text-[#4a6fa5] dark:text-[#6a90c5] border-b border-[rgba(74,111,165,0.2)]">
          <span className="font-bold text-[#1a2540] dark:text-white uppercase">(B) — REAL-TIME TELEMETRY &amp; DIAGNOSTIC STATUS</span>
          <span className="text-[11px] uppercase tracking-wider text-[#e05033] font-bold mt-1 sm:mt-0">
            BAYESIAN + IRT ENGINE &bull; CHARUSAT CAMPUS BENCHMARK
          </span>
        </div>

        {/* Clinical Rows with Massive Anton Labels */}
        <div className="divide-y divide-[rgba(74,111,165,0.18)]">
          <div className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition px-2" style={{ borderRadius: 0 }}>
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase text-[#1a2540] dark:text-white">
              CURRENT MASTERY
            </span>
            <div className="text-xs text-[#1a2540]/70 dark:text-slate-400 font-sans">
              Continuous Bayesian latent ability estimation
            </div>
            <div className="font-mono font-bold text-base text-[#1a2540] dark:text-white">
              84.6%
            </div>
            <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-1 bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 w-fit" style={{ borderRadius: 0 }}>
              OPTIMAL
            </span>
          </div>

          <div className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition px-2" style={{ borderRadius: 0 }}>
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase text-[#1a2540] dark:text-white">
              PREDICTION CONFIDENCE
            </span>
            <div className="text-xs text-[#1a2540]/70 dark:text-slate-400 font-sans">
              Confidence returned by calibrated 3PL IRT model
            </div>
            <div className="font-mono font-bold text-base text-[#1a2540] dark:text-white">
              92.4%
            </div>
            <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-1 bg-[#4a6fa5]/15 text-[#4a6fa5] dark:text-[#6a90c5] border border-[#4a6fa5]/30 w-fit" style={{ borderRadius: 0 }}>
              CALIBRATED
            </span>
          </div>

          <div className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition px-2" style={{ borderRadius: 0 }}>
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase text-[#1a2540] dark:text-white">
              MISCONCEPTION RISK
            </span>
            <div className="text-xs text-[#1a2540]/70 dark:text-slate-400 font-sans">
              Diagnostic error decay &amp; cognitive slip probability
            </div>
            <div className="font-mono font-bold text-base text-[#e05033]">
              LOW
            </div>
            <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-1 bg-[rgba(224,80,51,0.1)] text-[#e05033] border border-[rgba(224,80,51,0.3)] w-fit" style={{ borderRadius: 0 }}>
              MONITORED
            </span>
          </div>

          <div className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition px-2" style={{ borderRadius: 0 }}>
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase text-[#1a2540] dark:text-white">
              LATEST BENCHMARK
            </span>
            <div className="text-xs text-[#1a2540]/70 dark:text-slate-400 font-sans">
              Most recent completed adaptive diagnostic run
            </div>
            <div className="font-mono font-bold text-base text-[#1a2540] dark:text-white">
              CS301 DATA STRUCTURES
            </div>
            <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-1 bg-[#1a2540]/10 dark:bg-white/10 text-[#1a2540] dark:text-white border border-[rgba(74,111,165,0.3)] w-fit" style={{ borderRadius: 0 }}>
              VALIDATED
            </span>
          </div>
        </div>
      </section>

      {/* 3. The 4 Pedagogical Pillars */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] shadow-2xs hover:shadow-md transition-all" style={{ borderRadius: 0 }}>
            <div className="w-9 h-9 bg-[rgba(224,80,51,0.1)] text-[#e05033] flex items-center justify-center mb-3 border border-[rgba(224,80,51,0.3)]" style={{ borderRadius: 0 }}>
              <BookOpen className="w-4 h-4" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#4a6fa5] dark:text-[#6a90c5]">STAGE 01</p>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-0.5">1. What Practiced?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
              Granular interaction logging, time-on-question, difficulty calibration, and continuous streaks.
            </p>
          </div>

          <div className="p-5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] shadow-2xs hover:shadow-md transition-all" style={{ borderRadius: 0 }}>
            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/30" style={{ borderRadius: 0 }}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#4a6fa5] dark:text-[#6a90c5]">STAGE 02</p>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-0.5">2. What Learned?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
              BKT &amp; IRT knowledge curves modeling true conceptual retention over time rather than static marks.
            </p>
          </div>

          <div className="p-5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] shadow-2xs hover:shadow-md transition-all" style={{ borderRadius: 0 }}>
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30" style={{ borderRadius: 0 }}>
              <Cpu className="w-4 h-4" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#4a6fa5] dark:text-[#6a90c5]">STAGE 03</p>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-0.5">3. Where Weak?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
              Knowledge gap matrix isolating subtopic misconceptions across concept, application, and problem solving.
            </p>
          </div>

          <div className="p-5 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] shadow-2xs hover:shadow-md transition-all" style={{ borderRadius: 0 }}>
            <div className="w-9 h-9 bg-[#4a6fa5]/10 text-[#4a6fa5] dark:text-[#6a90c5] flex items-center justify-center mb-3 border border-[#4a6fa5]/30" style={{ borderRadius: 0 }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#4a6fa5] dark:text-[#6a90c5]">STAGE 04</p>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-0.5">4. What Next?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
              Targeted study plans, remedial drills, and adaptive question selection calibrated to student readiness.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Live Platform Intelligence Showcase (Interactive Preview) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] p-6 sm:p-8 shadow-sm" style={{ borderRadius: 0 }}>
          {/* Showcase Switcher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[rgba(74,111,165,0.2)] gap-4">
            <div>
              <div className="flex items-center gap-2">
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display uppercase text-[#1a2540] dark:text-white mt-1 tracking-tight">
                Explore The Learning Intelligence Engine
              </h2>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center bg-[#ede8df] dark:bg-[#0c1220] p-1 border border-[rgba(74,111,165,0.25)] text-xs font-mono" style={{ borderRadius: 0 }}>
              <button
                onClick={() => setPreviewTab('dashboard')}
                className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${previewTab === 'dashboard'
                    ? 'bg-[#e05033] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                style={{ borderRadius: 0 }}
              >
                Student Dashboard
              </button>
              <button
                onClick={() => setPreviewTab('adaptive')}
                className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${previewTab === 'adaptive'
                    ? 'bg-[#e05033] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                style={{ borderRadius: 0 }}
              >
                Adaptive Assessment
              </button>
              <button
                onClick={() => setPreviewTab('faculty')}
                className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${previewTab === 'faculty'
                    ? 'bg-[#e05033] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                style={{ borderRadius: 0 }}
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
                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Learning Mastery</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-display text-slate-900 dark:text-white">78%</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">+3.4%</span>
                  </div>
                  <div className="w-full bg-[rgba(74,111,165,0.15)] h-1.5 mt-2 overflow-hidden" style={{ borderRadius: 0 }}>
                    <div className="bg-[#e05033] h-full" style={{ width: '78%', borderRadius: 0 }} />
                  </div>
                </div>

                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Assessment Accuracy</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-display text-slate-900 dark:text-white">84%</span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">last 10 tests</span>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">Consistent Performance</p>
                </div>

                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Assessments Completed</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-display text-slate-900 dark:text-white">12</span>
                    <span className="font-mono text-xs text-[#e05033] font-bold">2 this week</span>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">Target: 4 monthly</p>
                </div>

                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Current Streak</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-display text-slate-900 dark:text-white">6 days</span>
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2">+1 day to weekly goal</p>
                </div>
              </div>

              {/* Progress Chart & Topic Mastery */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 border border-[rgba(74,111,165,0.25)] bg-[#f5f0e8] dark:bg-[#0c1220]" style={{ borderRadius: 0 }}>
                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,111,165,0.2)]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Learning Progress Trajectory</h3>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Continuous mastery curve</p>
                    </div>
                    <div className="flex items-center bg-[#ede8df] dark:bg-[#162038] p-0.5 border border-[rgba(74,111,165,0.2)] text-xs font-mono" style={{ borderRadius: 0 }}>
                      <button
                        onClick={() => setTimeframe('7 Days')}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer ${timeframe === '7 Days' ? 'bg-[#e05033] text-white' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        style={{ borderRadius: 0 }}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => setTimeframe('30 Days')}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer ${timeframe === '30 Days' ? 'bg-[#e05033] text-white' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        style={{ borderRadius: 0 }}
                      >
                        30 Days
                      </button>
                    </div>
                  </div>

                  <div className="h-52 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(106,144,197,0.15)' : 'rgba(74,111,165,0.15)'} />
                        <XAxis dataKey="day" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748B', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[50, 100]} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748B', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#121b30' : '#faf7f2',
                            borderColor: theme === 'dark' ? 'rgba(106,144,197,0.3)' : 'rgba(74,111,165,0.3)',
                            borderRadius: '0px',
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            fontSize: '11px',
                            fontFamily: 'IBM Plex Mono',
                          }}
                          formatter={(v: any) => [`${v}%`, 'Mastery']}
                        />
                        <Line type="monotone" dataKey="score" stroke="#e05033" strokeWidth={2.5} dot={{ r: 4, fill: '#e05033' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[rgba(74,111,165,0.2)] text-xs text-center font-mono">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Study time</span>
                      <strong className="text-slate-900 dark:text-white font-bold">28.5 hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Questions attempted</span>
                      <strong className="text-slate-900 dark:text-white font-bold">342</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Average accuracy</span>
                      <strong className="text-slate-900 dark:text-white font-bold">84%</strong>
                    </div>
                  </div>
                </div>

                {/* Topic Mastery */}
                <div className="p-5 border border-[rgba(74,111,165,0.25)] bg-[#f5f0e8] dark:bg-[#0c1220] space-y-3.5" style={{ borderRadius: 0 }}>
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(74,111,165,0.2)]">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Topic Mastery</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Core Modules</span>
                  </div>

                  {topicMasteryList.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.topic}</span>
                        <span
                          className={`font-mono font-bold text-xs ${item.percentage < 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : item.percentage >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[#e05033]'
                            }`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-[rgba(74,111,165,0.15)] h-1.5 overflow-hidden" style={{ borderRadius: 0 }}>
                        <div
                          className={`h-full transition-all duration-500 ${item.percentage >= 80
                              ? 'bg-emerald-500'
                              : item.percentage >= 65
                                ? 'bg-[#e05033]'
                                : 'bg-amber-500'
                            }`}
                          style={{ width: `${item.percentage}%`, borderRadius: 0 }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 text-xs">
                    <Link
                      href="/student/dashboard"
                      className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#e05033] hover:underline flex items-center gap-1"
                    >
                      <span>View all topics &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Knowledge Gap Table */}
              <div className="p-5 border border-[rgba(74,111,165,0.25)] bg-[#f5f0e8] dark:bg-[#0c1220]" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(74,111,165,0.2)]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Knowledge Gaps Matrix</h3>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[#e05033] bg-[rgba(224,80,51,0.1)] px-2.5 py-0.5 border border-[rgba(224,80,51,0.3)]" style={{ borderRadius: 0 }}>
                    ● Triage Active
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(74,111,165,0.2)] font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="pb-2 font-bold">Topic</th>
                        <th className="pb-2 text-center font-bold">Concept</th>
                        <th className="pb-2 text-center font-bold">Application</th>
                        <th className="pb-2 text-center font-bold">Problem Solving</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(74,111,165,0.15)]">
                      {knowledgeGapMatrix.map((row) => (
                        <tr key={row.topic}>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{row.topic}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 border font-mono text-[10px] font-bold ${getHeatmapColor(row.concept)}`} style={{ borderRadius: 0 }}>
                              {row.concept}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 border font-mono text-[10px] font-bold ${getHeatmapColor(row.application)}`} style={{ borderRadius: 0 }}>
                              {row.application}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block w-16 py-0.5 border font-mono text-[10px] font-bold ${getHeatmapColor(row.problemSolving)}`} style={{ borderRadius: 0 }}>
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
              <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)] flex items-center justify-between" style={{ borderRadius: 0 }}>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Structures Assessment</h3>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Adaptive Question Calibration Mode</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Progress</span>
                    <strong className="text-slate-900 dark:text-white">Q8 / 20</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-[rgba(74,111,165,0.25)]" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Timer</span>
                    <strong className="text-[#e05033]">07:42</strong>
                  </div>
                  <div className="h-6 w-[1px] bg-[rgba(74,111,165,0.25)]" />
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Difficulty</span>
                    <span className="inline-block bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 font-bold text-[10px]" style={{ borderRadius: 0 }}>
                      Medium
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Adjusted Banner */}
              {assessmentFeedback && (
                <div className="p-3.5 bg-[rgba(224,80,51,0.1)] border border-[rgba(224,80,51,0.3)] text-xs text-[#e05033] flex items-center justify-between animate-fadeIn" style={{ borderRadius: 0 }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[#e05033] font-bold">✦</span>
                    <span>
                      <strong>Assessment calibrated:</strong> Next question selected based on your cognitive trajectory.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#e05033] bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 border border-[rgba(224,80,51,0.3)] font-bold" style={{ borderRadius: 0 }}>
                    Calibrated
                  </span>
                </div>
              )}

              {/* Question & Options */}
              <div className="p-6 border border-[rgba(74,111,165,0.25)] bg-[#f5f0e8] dark:bg-[#0c1220] space-y-4" style={{ borderRadius: 0 }}>
                <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  Which data structure is most suitable for implementing a Breadth-First Search (BFS) graph traversal?
                </p>

                <div className="space-y-2.5 pt-2 font-mono">
                  {['Stack', 'Queue', 'Heap', 'Linked List'].map((opt, idx) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectOptionInPreview(idx)}
                      className={`w-full p-3.5 border text-xs font-medium text-left flex items-center gap-3 transition-all cursor-pointer ${selectedOption === idx
                          ? 'border-[#e05033] bg-[rgba(224,80,51,0.1)] text-[#e05033] font-semibold'
                          : 'border-[rgba(74,111,165,0.25)] bg-[#faf7f2] dark:bg-[#121b30] text-slate-800 dark:text-slate-200 hover:border-[#4a6fa5]'
                        }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div
                        className={`w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold border transition ${selectedOption === idx
                            ? 'bg-[#e05033] text-white border-[#e05033]'
                            : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        style={{ borderRadius: 0 }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-[rgba(74,111,165,0.2)] flex items-center justify-between text-xs">
                  <button className="px-3.5 py-1.5 border border-[rgba(74,111,165,0.3)] text-[#4a6fa5] hover:text-[#1a2540] dark:hover:text-white font-mono text-xs uppercase tracking-wider" style={{ borderRadius: 0 }}>
                    Previous
                  </button>
                  <Link
                    href="/student/assessments"
                    className="px-4 py-2 bg-[#e05033] hover:bg-[#c93f25] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm"
                    style={{ borderRadius: 0 }}
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
                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Enrolled Cohort</span>
                  <div className="text-3xl font-black font-display text-slate-900 dark:text-white mt-1">64 Students</div>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">CS301 &bull; Section A</span>
                </div>
                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Cohort Mastery</span>
                  <div className="text-3xl font-black font-display text-slate-900 dark:text-white mt-1">74% Avg</div>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Passing benchmark met</span>
                </div>
                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Upward Trajectory</span>
                  <div className="text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-1">41 Students</div>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">+5.4% growth</span>
                </div>
                <div className="p-4 bg-[#f5f0e8] dark:bg-[#0c1220] border border-[rgba(74,111,165,0.25)]" style={{ borderRadius: 0 }}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5]">Intervention Alert</span>
                  <div className="text-3xl font-black font-display text-[#e05033] mt-1">12 At-Risk</div>
                  <span className="font-mono text-[10px] text-[#e05033] font-bold">&lt;55% in recent tests</span>
                </div>
              </div>

              {/* Class Learning Insights Cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Learning Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-4 border border-[rgba(224,80,51,0.3)] bg-[rgba(224,80,51,0.06)] space-y-1" style={{ borderRadius: 0 }}>
                    <span className="font-mono text-[10px] uppercase font-bold text-[#e05033] block">Misconception Alert</span>
                    <p className="text-slate-800 dark:text-slate-200">23 students struggling with Dynamic Programming state space.</p>
                  </div>
                  <div className="p-4 border border-amber-300 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 space-y-1" style={{ borderRadius: 0 }}>
                    <span className="font-mono text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Trend Shift</span>
                    <p className="text-slate-800 dark:text-slate-200">Average performance in Graph Algorithms decreased by 8% this week.</p>
                  </div>
                  <div className="p-4 border border-emerald-300 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-1" style={{ borderRadius: 0 }}>
                    <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Intervention Impact</span>
                    <p className="text-slate-800 dark:text-slate-200">Students completing practice sets improved accuracy by 22%.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <Link
                  href="/faculty/dashboard"
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#e05033] hover:underline"
                >
                  <span>Open Full Faculty Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4.5 Callout Panel: The Intelligence Engine Awaits a Signal */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-4 font-mono">
        <div className="bg-[#1a2540] dark:bg-[#0c1220] text-white p-8 sm:p-10 border border-[rgba(74,111,165,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#e05033]/10 blur-3xl pointer-events-none" />
          <div className="max-w-xl relative z-10">
            <span className="text-[10px] uppercase font-bold text-[#e05033] tracking-widest block mb-1">
              DIAGNOSTIC PIPELINE READY
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight text-white leading-none">
              THE ENGINE AWAITS A SIGNAL.
            </h2>
            <p className="text-xs text-slate-300 font-sans mt-2.5 leading-relaxed">
              No active test submission running in this session. Log in to your institutional account to populate this surface with real-time student telemetry.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/20 transition shadow-sm"
              style={{ borderRadius: 0 }}
            >
              <span>Connect Assessment Pipeline →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Direct Role Access Directory */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-10 border-t border-[rgba(74,111,165,0.2)]">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="font-mono text-[10px] font-bold text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-widest">
            Institutional Role Gateways
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-display uppercase text-slate-900 dark:text-white mt-1 tracking-tight">
            Access CLIAS by Department Designation
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test accounts configured with default credential: <code className="font-mono bg-[#ede8df] dark:bg-[#162038] px-2 py-0.5 text-slate-800 dark:text-slate-200 border border-[rgba(74,111,165,0.2)]">clias123</code>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs font-mono">
          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-[#e05033] hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-[#e05033] block mb-1 uppercase tracking-wider">STUDENT</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">Adaptive tests &amp; mastery</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-[#4a6fa5] hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-[#4a6fa5] dark:text-[#6a90c5] block mb-1 uppercase tracking-wider">FACULTY</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">Cohort intelligence &amp; drills</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-amber-500 hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1 uppercase tracking-wider">COUNSELLOR</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">At-risk student tracking</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-[#4a6fa5] hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-[#4a6fa5] dark:text-[#6a90c5] block mb-1 uppercase tracking-wider">HOD</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">Department curriculum metrics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-purple-500 hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1 uppercase tracking-wider">DEAN / HEAD</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">Institutional analytics</p>
          </Link>

          <Link
            href="/auth/login"
            className="p-4 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] hover:border-[#e05033] hover:shadow-md transition-all text-center shadow-2xs group"
            style={{ borderRadius: 0 }}
          >
            <span className="font-bold text-[#e05033] block mb-1 uppercase tracking-wider">SUPER ADMIN</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">System configuration</p>
          </Link>
        </div>
      </section>

      {/* 6. Institutional Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-[rgba(74,111,165,0.2)] text-center text-xs text-[#4a6fa5] dark:text-[#6a90c5] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div>
          <p>
            CLIAS &copy; 2026 {universityName} &bull; CHARUSAT Learning Intelligence System
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Engineered &amp; Architected by <span className="font-semibold text-[#1a2540] dark:text-white">Jigar Sakhia</span> (Jigar), Param &amp; AdaptIQ Team
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
          <span>Institutional Accreditation A+</span>
          <span>&bull;</span>
          <span>Knowledge Modeling Framework</span>
        </div>
      </footer>
    </div>
  );
}
