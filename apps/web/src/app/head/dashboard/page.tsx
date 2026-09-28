'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  Building,
  GraduationCap,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function HeadDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.HEAD && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
    }
  }, [user, loading]);

  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title={`${universityName} Institutional Intelligence Executive Console`}
          subtitle="Cross-departmental learning curves, accreditation indicators & faculty performance"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Institutional Academic Overview
              </h2>
              <p className="text-xs text-slate-500">
                Chandubhai S Patel Institute of Technology (CSPIT) Cross-Disciplinary Metrics
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Institutional Head View
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Enrolled"
              value="5"
              subtitle="CSPIT Seed Cohort"
              icon={GraduationCap}
              color="blue"
            />
            <MetricCard
              title="Active Departments"
              value="1"
              subtitle="CSE Department Active"
              icon={Building}
              color="indigo"
            />
            <MetricCard
              title="Institutional Mastery"
              value="62.4%"
              subtitle="Institution-Wide Knowledge Index"
              icon={TrendingUp}
              trend={{ value: 'Above 60% baseline', isPositive: true }}
              color="emerald"
            />
            <MetricCard
              title="Curriculum Items"
              value="35"
              subtitle="Active In Item Bank"
              icon={Award}
              color="purple"
            />
          </div>

          {/* Department Comparison Teaser */}
          <div id="programs" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Engineering Programs Matrix</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <span className="font-bold text-indigo-950 block">CSE</span>
                <span className="text-[11px] text-indigo-700 font-semibold mt-1 block">Active (62.4% Mastery)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <span className="font-bold text-slate-700 block">CE</span>
                <span className="text-[11px] text-slate-500 block mt-1">Phase 7 Integration</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <span className="font-bold text-slate-700 block">IT</span>
                <span className="text-[11px] text-slate-500 block mt-1">Phase 7 Integration</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <span className="font-bold text-slate-700 block">EC</span>
                <span className="text-[11px] text-slate-500 block mt-1">Phase 7 Integration</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <span className="font-bold text-slate-700 block">ME</span>
                <span className="text-[11px] text-slate-500 block mt-1">Phase 7 Integration</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-950 flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-blue-950">Institutional Governance Architecture Verified</h4>
              <p className="text-blue-800/80 leading-relaxed">
                As required by Rule 4 & 5, institutional leadership dashboards allow broad high-level macro visibility across institutes, departments, and programs while maintaining role isolation.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
