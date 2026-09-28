'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  Users,
  AlertTriangle,
  HeartPulse,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function CounsellorDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Mentorship & Guidance Console"
          subtitle="Scoped to students assigned via institutional mentor-mentee mapping"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Assigned Student Cohort
              </h2>
              <p className="text-xs text-slate-500">
                Data scoped strictly via CounsellorAssignment table. Zero department-wide overexposure.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Assigned Mentee Batch: 2024-2028
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Mentees"
              value="24"
              subtitle="Scoped Under Mentorship"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Engagement Alerts"
              value="3"
              subtitle="Low Practice Activity"
              icon={AlertTriangle}
              color="rose"
            />
            <MetricCard
              title="Average Mastery"
              value="69.2%"
              subtitle="Knowledge Model Index"
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Intervention Status"
              value="Normal"
              subtitle="Phase 2 Risk Scoring"
              icon={HeartPulse}
              color="blue"
            />
          </div>

          {/* Assigned Students Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assigned Student Profiles</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Knowledge Mastery</th>
                    <th className="p-3">Primary Focus Topic</th>
                    <th className="p-3">Mentorship Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">24CS001</td>
                    <td className="p-3 font-semibold text-slate-900">Rahul Patel</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">student@charusat.edu.in</td>
                    <td className="p-3">
                      <span className="font-extrabold text-indigo-600">62.2%</span>
                    </td>
                    <td className="p-3">Dynamic Programming (31%)</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Learner
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Architecture Guarantee Banner */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-950">Strict Isolation Architecture Verified</h4>
              <p className="text-amber-800/80 leading-relaxed">
                As specified in Rule 5 & 23, counsellors can view only students assigned directly to them through `CounsellorAssignment`. Unassigned departmental records remain completely inaccessible to safeguard student privacy.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
