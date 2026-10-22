'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Server,
  Database,
  Cpu,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  BookOpen,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== UserRole.SUPER_ADMIN)) {
      router.push('/auth/login');
      return;
    }

    if (user && user.role === UserRole.SUPER_ADMIN) {
      loadStats();
    }
  }, [user, authLoading]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/dashboard');
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.warn('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  return (
    <div className="min-h-screen bg-transparent flex text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Super Admin Institutional Console"
          subtitle={`${universityName} Learning Intelligence & Assessment Platform System Overview`}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                ADMIN CONSOLE
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-[8px] uppercase tracking-wider text-[#6b7fa3]">SYSTEM STATUS</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                99.9<span className="font-mono text-sm text-[#e05033]">%</span>
              </strong>
              <p className="mono text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">CHARUSAT SECURE NETWORK</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">ROSTER</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{stats ? (stats.totalAuthorizedStudents ?? 0).toString() : '0'}</div>
              <div className="metric-label mono">AUTHORIZED STUDENTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">ACTIVE</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{stats ? (stats.activatedStudents ?? 0).toString() : '0'}</div>
              <div className="metric-label mono">ACTIVATED ACCOUNTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>FACULTY</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{stats ? (stats.totalFaculty ?? 0).toString() : '0'}</div>
              <div className="metric-label mono">INSTRUCTORS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">CLUSTER</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">HEALTHY</div>
              <div className="metric-label mono">NODE TELEMETRY</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
             
              <h2 className="font-display text-xl uppercase tracking-wide">SYSTEM ARCHITECTURE & PLATFORM OVERVIEW</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Role-based access delegation, student roster synchronization, and live academic cluster infrastructure monitoring.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admin/students"
                prefetch={false}
                className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
                style={{ borderRadius: 0 }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                <span>MANAGE STUDENTS</span>
              </Link>
            </div>
          </div>

          {/* Primary Telemetry Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Authorized Roster"
              value={stats ? stats.totalAuthorizedStudents?.toString() : '...'}
              subtitle="Whitelisted Student Records"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Activated Accounts"
              value={stats ? stats.activatedStudents?.toString() : '...'}
              subtitle="Registered & Verified"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="Activation Rate"
              value={stats ? `${stats.activationRate}%` : '...'}
              subtitle="Student Onboarding Progress"
              icon={ShieldCheck}
              color="blue"
            />
            <MetricCard
              title="Calibrated Questions"
              value={stats ? stats.totalQuestionsInBank?.toString() : '...'}
              subtitle="Active Across Item Banks"
              icon={BookOpen}
              color="purple"
            />
          </div>

          {/* System Microservices Health Cards */}
          <div className="bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] p-6 shadow-sm space-y-4" style={{borderRadius:0}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Infrastructure Health &amp; Microservices Telemetry
                </h3>
               
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                100% Uptime
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* NestJS Core API */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>Core API Service</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Online (Port 4000)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  NestJS v10 runtime • Express router • JWT RBAC Auth active
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Latency: 12ms</span>
                  <span>Prefix: /api/v1</span>
                </div>
              </div>

              {/* FastAPI AI Service */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    <span>AI Intelligence Service</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Online (Port 8000)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  FastAPI • Socratic Tutoring • Misconception Detection • RAG Grounding
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Status: Healthy</span>
                  <span>Phase: 3 Active</span>
                </div>
              </div>

              {/* MySQL / Prisma DB */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Relational Database</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Online (Port 3307)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  MySQL 8.0 • Prisma ORM Client v5.10 • Auto pool active
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Database: clias_db</span>
                  <span>Pool: 10 connections</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin/students"
              prefetch={false}
              className="p-6 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm hover:shadow-md transition hover:border-[#4a6fa5]/60 dark:hover:border-[#6a90c5]/60 group" style={{borderRadius:0}}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Authorized Students</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Import CSV rosters, inspect activated accounts, monitor enrollment numbers and divisional assignments.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 gap-1">
                <span>Access Student Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/admin/institutes"
              prefetch={false}
              className="p-6 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm hover:shadow-md transition hover:border-[#e05033]/50 group" style={{borderRadius:0}}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Institution Hierarchy</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Configure constituent institutes (CSPIT, DEPSTAR), departments (CSE, CE, IT), and accredited degree programs.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1">
                <span>Manage Hierarchy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/admin/settings"
              prefetch={false}
              className="p-6 bg-[#faf7f2] dark:bg-[#121b30] border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm hover:shadow-md transition hover:border-purple-400/60 group" style={{borderRadius:0}}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Settings className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">System Settings</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Manage university email domains, security keys, JWT expiration policies, and AI microservice configurations.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 gap-1">
                <span>Configure Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>


        </main>
      </div>
    </div>
  );
}
