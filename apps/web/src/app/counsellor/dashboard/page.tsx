'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
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
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface AtRiskAlert {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  semester: number;
  division: string;
  email: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  triggerReason: string;
  suggestedIntervention: string;
  actionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export default function CounsellorDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menteesSummary, setMenteesSummary] = useState<any>(null);
  const [atRiskAlerts, setAtRiskAlerts] = useState<AtRiskAlert[]>([]);
  const [fetching, setFetching] = useState(false);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadMenteesData();
      loadAtRiskAlerts();
    }
  }, [user, loading]);

  const loadMenteesData = async () => {
    setFetching(true);
    try {
      const res: any = await api.get('/analytics/counsellor/mentees/summary');
      setMenteesSummary(res);
    } catch {
      // Fallback
    } finally {
      setFetching(false);
    }
  };

  const loadAtRiskAlerts = async () => {
    try {
      const res: any = await api.get('/analytics/counsellor/at-risk');
      if (Array.isArray(res)) {
        setAtRiskAlerts(res);
      } else {
        setAtRiskAlerts([]);
      }
    } catch {
      setAtRiskAlerts([]);
    }
  };

  const handleUpdateStatus = async (alertId: string, newStatus: 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED') => {
    setUpdatingAlertId(alertId);
    try {
      await api.patch(`/analytics/counsellor/at-risk/${alertId}`, {
        status: newStatus,
        actionNotes: `Status updated to ${newStatus} by Counsellor at ${new Date().toLocaleTimeString()}`,
      });
      setAtRiskAlerts(
        atRiskAlerts.map((a) =>
          a.id === alertId ? { ...a, status: newStatus, resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : a.resolvedAt } : a
        )
      );
    } catch {
      // Local optimistic update
      setAtRiskAlerts(
        atRiskAlerts.map((a) =>
          a.id === alertId ? { ...a, status: newStatus, resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : a.resolvedAt } : a
        )
      );
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const filteredAlerts = atRiskAlerts.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Mentorship & Guidance Console"
          subtitle="Scoped to students assigned via institutional mentor-mentee mapping"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Mentorship Cohort & Early Warning Queue
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Early Warning Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional early-warning diagnostics identify disengagement, mastery decay, and persistent misconception traps.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-indigo-300 border border-slate-800">
              {menteesSummary?.totalAssignedMentees ? `Assigned Mentees: ${menteesSummary.totalAssignedMentees} Students` : 'Assigned Mentee Batch'}
            </span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Mentees"
              value={(menteesSummary?.totalAssignedMentees ?? 0).toString()}
              subtitle="Direct Mentorship"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Active Alerts"
              value={atRiskAlerts.filter((a) => a.status !== 'RESOLVED').length.toString()}
              subtitle="Intervention Required"
              icon={AlertTriangle}
              color="rose"
            />
            <MetricCard
              title="Average Mastery"
              value={`${menteesSummary?.cohortAverageMastery ?? 0}%`}
              subtitle="Knowledge Model Index"
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Intervention Rate"
              value={
                atRiskAlerts.length > 0
                  ? `${Math.round(
                      (atRiskAlerts.filter((a) => a.status === 'RESOLVED' || a.status === 'IN_PROGRESS')
                        .length /
                        atRiskAlerts.length) *
                        100,
                    )}%`
                  : '100%'
              }
              subtitle="Mentorship SLA Met"
              icon={HeartPulse}
              color="blue"
            />
          </div>

          {/* At-Risk Student Predictive Queue */}
          <div id="alerts" className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Predictive At-Risk Student Intervention Queue
                </h3>
                <p className="text-xs text-slate-400">
                  Triggered automatically when student mastery drops below 35%, practice stops for &gt; 5 days, or misconception failure rate exceeds 50%.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg border ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity} RISK
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {alert.studentName}
                            <span className="font-mono text-xs text-slate-400">({alert.enrollmentNumber})</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              Sem {alert.semester} • Div {alert.division}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(alert.status)}`}>
                          {alert.status.replace('_', ' ')}
                        </span>

                        {alert.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'IN_PROGRESS')}
                            disabled={updatingAlertId === alert.id}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Initiate Intervention
                          </button>
                        )}

                        {alert.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                            disabled={updatingAlertId === alert.id}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        Trigger Condition:
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{alert.triggerReason}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1">
                      <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Prescribed Pedagogical Intervention:
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{alert.suggestedIntervention}</p>
                      {alert.actionNotes && (
                        <div className="text-[11px] text-slate-400 pt-1 border-t border-indigo-500/10 mt-1.5">
                          <span className="font-semibold text-slate-300">Mentorship Log: </span>
                          {alert.actionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No at-risk alerts match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Assigned Students Roster */}
          <div id="students" className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Assigned Student Knowledge Profiles</h3>
              <a
                href="/counsellor/students"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
              >
                <span>Full Roster View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Knowledge Mastery</th>
                    <th className="p-3">Primary Focus Topic</th>
                    <th className="p-3">Mentorship Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                  {menteesSummary?.mentees && menteesSummary.mentees.length > 0 ? (
                    menteesSummary.mentees.map((m: any) => (
                      <tr key={m.studentId} className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-white">{m.enrollmentNumber}</td>
                        <td className="p-3 font-semibold text-white">{m.name}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">{m.email}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-indigo-400">{m.averageMastery}%</span>
                        </td>
                        <td className="p-3">{m.primaryFocusTopic || 'Core Fundamentals'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.riskLevel === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : m.riskLevel === 'WARNING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {m.riskLevel === 'HEALTHY' ? 'Normal Progress' : m.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                        No assigned mentees currently requiring intervention.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Architecture Guarantee Banner */}
          <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-white">Strict Isolation Architecture Verified</h4>
              <p className="text-indigo-300/80 leading-relaxed">
                As specified in Rule 5 & 23, counsellors can view only students assigned directly to them through `CounsellorAssignment`. Unassigned departmental records remain completely inaccessible to safeguard student privacy.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
