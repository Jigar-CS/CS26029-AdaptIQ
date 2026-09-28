'use client';

import React from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Users,
  GraduationCap,
  ArrowRight,
  BookOpen,
  Cpu,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none"></div>

      {/* Navigation */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">CLIAS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 1 Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{universityName} Learning Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
          >
            Student Register
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Moving Higher Education Beyond Marks to Continuous Knowledge Modeling</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 max-w-4xl mx-auto">
          AI-Powered Student Learning Intelligence & Adaptive Assessment
        </h1>

        <p className="text-base sm:text-lg text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed">
          CLIAS tracks student practice interactions to continuously evolve a dynamic topic mastery profile, answering where students excel, where misconceptions recur, and what to learn next.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xl shadow-indigo-600/40 transition transform hover:-translate-y-0.5"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition"
          >
            <span>Student Verification Flow</span>
          </Link>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-16 text-left">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">1. What Practiced?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular attempt logging, time-on-question, difficulty at attempt, and streaks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">2. What Learned?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              EWMA-weighted knowledge curves showing real mastery over time rather than static marks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">3. Where Weak?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Algorithmic topic triage detecting subtopics with low accuracy and recurring errors.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">4. What Next?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adaptive recommendations calibrated to student readiness and target placement skills.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Credentials Quick Guide */}
      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-slate-800/80 text-center">
        <h3 className="text-sm uppercase font-bold text-indigo-400 tracking-wider mb-2">
          Development Demo Credentials
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Password for all demo accounts: <code className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded">clias123</code>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">STUDENT</span>
            <span className="text-slate-400 font-mono text-[10px]">student@charusat.edu.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-300 block mb-1">FACULTY</span>
            <span className="text-slate-400 font-mono text-[10px]">faculty@charusat.edu.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-amber-300 block mb-1">COUNSELLOR</span>
            <span className="text-slate-400 font-mono text-[10px]">counsellor@charusat.edu.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-purple-300 block mb-1">HOD</span>
            <span className="text-slate-400 font-mono text-[10px]">hod@charusat.edu.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-blue-300 block mb-1">HEAD</span>
            <span className="text-slate-400 font-mono text-[10px]">head@charusat.edu.in</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-rose-300 block mb-1">SUPER_ADMIN</span>
            <span className="text-slate-400 font-mono text-[10px]">admin@charusat.edu.in</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>CLIAS © 2026 — Designed for Modern Higher Education Knowledge Modeling.</p>
      </footer>
    </div>
  );
}
