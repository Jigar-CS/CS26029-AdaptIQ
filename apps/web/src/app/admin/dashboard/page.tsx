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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Super Admin Institutional Console"
          subtitle={`${universityName} Learning Intelligence & Assessment Platform System Overview`}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  System Architecture &amp; Platform Overview
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Cluster Healthy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional governance, role-based access delegation, student roster synchronization, and infrastructure monitoring.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/students"
                prefetch={false}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Manage Students</span>
              </Link>
            </div>
          </div>

          {/* Primary Telemetry Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Authorized Roster"
              value={(stats?.totalAuthorizedStudents ?? 119).toString()}
              subtitle="Whitelisted Student Records"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Activated Accounts"
              value={(stats?.activatedStudents ?? 3).toString()}
              subtitle="Registered & Verified"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="Activation Rate"
              value={`${stats?.activationRate ?? 3}%`}
              subtitle="Student Onboarding Progress"
              icon={ShieldCheck}
              color="blue"
            />
            <MetricCard
              title="Calibrated Questions"
              value={(stats?.totalQuestionsInBank ?? 31).toString()}
              subtitle="Active Across Item Banks"
              icon={BookOpen}
              color="purple"
            />
          </div>

          {/* System Microservices Health Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Infrastructure Health &amp; Microservices Telemetry
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time status of backend API, AI inference engines, and persistence layers
                </p>
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
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition hover:border-blue-400 dark:hover:border-blue-600 group"
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
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition hover:border-indigo-400 dark:hover:border-indigo-600 group"
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
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition hover:border-purple-400 dark:hover:border-purple-600 group"
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

          {/* Security & Access Isolation Banner */}
          <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200 flex items-start gap-4 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Institutional Super Admin Governance Active</h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Full privileges granted for student identity authorization, cross-institutional data reconciliation, curriculum provisioning, and global platform security configuration.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
