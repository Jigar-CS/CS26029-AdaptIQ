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
    if (!loading && (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HOD && !user.isCounsellor))) {
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
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
      default:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Mentorship & Guidance Console"
          subtitle="Scoped to students assigned via institutional mentor-mentee mapping"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                COUNSELLOR CONSOLE
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-[8px] uppercase tracking-wider text-[#6b7fa3]">AT-RISK QUEUE</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {atRiskAlerts.length}<span className="font-mono text-sm text-[#e05033]">ALERTS</span>
              </strong>
              <p className="mono text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">EARLY WARNING ACTIVE</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">MENTEES</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{menteesSummary?.totalAssignedMentees ?? 0}</div>
              <div className="metric-label mono">ASSIGNED STUDENTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">ALERTS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{atRiskAlerts.length}</div>
              <div className="metric-label mono">EARLY WARNINGS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>MASTERY</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{menteesSummary?.avgMastery ? `${Math.round(menteesSummary.avgMastery)}%` : '0%'}</div>
              <div className="metric-label mono">COHORT AVERAGE</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">STATUS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">ACTIVE</div>
              <div className="metric-label mono">MONITORING SYSTEM</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <h2 className="font-display text-xl uppercase tracking-wide">MENTORSHIP COHORT & INTERVENTION QUEUE</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Algorithmic detection flagging learning disengagement, mastery decay, and persistent prerequisite gaps.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push('/faculty/counselling/students')}
                className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
                style={{ borderRadius: 0 }}
              >
                <span>VIEW MENTEE TELEMETRY</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </button>
            </div>
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
          <div id="alerts" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Predictive At-Risk Student Intervention Queue
                </h3>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                    className="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg border ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity} RISK
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            {alert.studentName}
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">({alert.enrollmentNumber})</span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                          >
                            Initiate Intervention
                          </button>
                        )}

                        {alert.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                            disabled={updatingAlertId === alert.id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/30 text-xs space-y-1">
                      <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        Trigger Condition:
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{alert.triggerReason}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/30 text-xs space-y-1">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Prescribed Pedagogical Intervention:
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{alert.suggestedIntervention}</p>
                      {alert.actionNotes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-indigo-200/60 dark:border-indigo-800/30 mt-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Mentorship Log: </span>
                          {alert.actionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No at-risk alerts match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Assigned Students Roster */}
          <div id="students" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assigned Student Knowledge Profiles</h3>
              <a
                href="/faculty/counselling/students"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline flex items-center gap-1"
              >
                <span>Full Roster View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Knowledge Mastery</th>
                    <th className="p-3">Primary Focus Topic</th>
                    <th className="p-3">Mentorship Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {menteesSummary?.mentees && menteesSummary.mentees.length > 0 ? (
                    menteesSummary.mentees.map((m: any) => (
                      <tr key={m.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{m.enrollmentNumber}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{m.email}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{m.averageMastery}%</span>
                        </td>
                        <td className="p-3">{m.primaryFocusTopic || 'Core Fundamentals'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.riskLevel === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : m.riskLevel === 'WARNING'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {m.riskLevel === 'HEALTHY' ? 'Normal Progress' : m.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                        No assigned mentees currently requiring intervention.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </main>
      </div>
    </div>
  );
}
