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
  ShieldAlert,
  AlertTriangle,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  User,
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

export default function CounsellorAlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<AtRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    const loadAlerts = async () => {
      setLoading(true);
      try {
        const res: any = await api.get('/analytics/counsellor/at-risk');
        if (Array.isArray(res)) {
          setAlerts(res);
        } else {
          setAlerts([]);
        }
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAlerts();
    }
  }, [user, authLoading]);

  const handleUpdateStatus = async (alertId: string, newStatus: 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED') => {
    setUpdatingAlertId(alertId);
    try {
      await api.patch(`/analytics/counsellor/at-risk/${alertId}`, {
        status: newStatus,
        actionNotes: `Status updated to ${newStatus} by Counsellor at ${new Date().toLocaleTimeString()}`,
      });
    } catch {
      // optimistic update
    } finally {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: newStatus,
                resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : a.resolvedAt,
                actionNotes:
                  a.actionNotes ||
                  `Intervention status updated to ${newStatus} on ${new Date().toLocaleDateString()}`,
              }
            : a
        )
      );
      setUpdatingAlertId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    return matchesStatus && matchesSeverity;
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
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const pendingCount = alerts.filter((a) => a.status === 'PENDING').length;
  const inProgressCount = alerts.filter((a) => a.status === 'IN_PROGRESS').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Predictive Early-Warning & Intervention Console"
          subtitle="Real-time detection of student learning disengagement, decay, and persistent misconception traps"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Academic Intervention Alerts
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {pendingCount} Actionable Triggers
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated Bayesian Knowledge Tracing flags students when mastery decay occurs or misconception error rate exceeds 50%.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Critical Priority"
              value={criticalCount}
              subtitle="Mastery < 35% or Inactive"
              icon={ShieldAlert}
              color="rose"
            />
            <MetricCard
              title="Pending Reviews"
              value={pendingCount}
              subtitle="Awaiting Counsellor Action"
              icon={Clock}
              color="amber"
            />
            <MetricCard
              title="Active Interventions"
              value={inProgressCount}
              subtitle="Remediation in Progress"
              icon={AlertTriangle}
              color="blue"
            />
            <MetricCard
              title="Resolved Cases"
              value={resolvedCount}
              subtitle="Mastery Restored"
              icon={CheckCircle2}
              color="emerald"
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Alerts:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Severity:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      severityFilter === sev
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts Cards List */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Loading live diagnostic alerts...
              </div>
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg border ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity} RISK
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          {alert.studentName}
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            ({alert.enrollmentNumber})
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Sem {alert.semester} • Div {alert.division}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{alert.email}</p>
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
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                        >
                          Initiate Intervention
                        </button>
                      )}

                      {alert.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                          disabled={updatingAlertId === alert.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Trigger Reason */}
                  <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs space-y-1">
                    <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      Trigger Diagnostic:
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{alert.triggerReason}</p>
                  </div>

                  {/* Prescribed Pedagogical Intervention */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs space-y-1">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Prescribed Pedagogical Intervention:
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{alert.suggestedIntervention}</p>
                    {alert.actionNotes && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-indigo-200/40 dark:border-indigo-800/30 mt-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Mentorship Log: </span>
                        {alert.actionNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                No alerts match the chosen status and severity filter.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
