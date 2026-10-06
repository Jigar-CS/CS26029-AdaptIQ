'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  BrainCircuit,
  Award,
  BookOpen,
  CheckCircle2,
  Sparkles,
  BarChart2,
  FileSpreadsheet,
  Download,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface TopicAnalytics {
  name: string;
  avgMastery: number;
  attemptCount: number;
  struggleRate: number;
  status: 'HEALTHY' | 'NEEDS_REINFORCEMENT' | 'CRITICAL_DEFICIENCY' | 'UNTESTED';
  topMisconception: string;
}

export default function FacultyClassAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('DIV 1');
  const [availableDivisions, setAvailableDivisions] = useState<string[]>(['DIV 1', 'DIV 2', 'All Divisions']);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [topicAnalytics, setTopicAnalytics] = useState<TopicAnalytics[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  // 1. Initial Course Load
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    const loadCourses = async () => {
      try {
        const courses: any = await api.get('/courses');
        if (courses && courses.length > 0) {
          setCoursesList(courses);
          const facultyCourseId = user?.courseId || user?.assignedCourse?.id;
          const active = (facultyCourseId && courses.find((c: any) => c.id === facultyCourseId)) || courses.find((c: any) => c.code === 'CS301') || courses[0];
          setSelectedCourseId(active.id);
        }
      } catch (e) {
        console.error('Error loading courses:', e);
      }
    };

    if (user) {
      loadCourses();
    }
  }, [user, authLoading]);

  // 2. Dynamic Summary Data Load whenever selectedCourseId or selectedDivision changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchSummary = async () => {
      setLoadingAnalytics(true);
      try {
        const divParam = selectedDivision && selectedDivision !== 'All Divisions' ? `?division=${encodeURIComponent(selectedDivision)}` : '?division=ALL';
        const summary: any = await api.get(`/analytics/faculty/course/${selectedCourseId}/summary${divParam}`);
        if (summary) {
          setSummaryData(summary);
          if (summary.availableDivisions && summary.availableDivisions.length > 0) {
            const divs = Array.from(new Set([...summary.availableDivisions, 'All Divisions']));
            setAvailableDivisions(divs);
          }
          if (summary.topicAnalytics && summary.topicAnalytics.length > 0) {
            setTopicAnalytics(
              summary.topicAnalytics.map((t: any) => ({
                name: t.topicName,
                avgMastery: t.classAverageMastery,
                attemptCount: t.totalAttempts,
                struggleRate: t.totalAttempts > 0 ? Math.max(0, 100 - (t.accuracy ?? 0)) : 0,
                status: t.status || (t.totalAttempts === 0 ? 'UNTESTED' : t.classAverageMastery >= 70 ? 'HEALTHY' : t.classAverageMastery >= 45 ? 'NEEDS_REINFORCEMENT' : 'CRITICAL_DEFICIENCY'),
                topMisconception: t.topMisconception || (t.totalAttempts === 0 ? 'No diagnostic attempts logged yet' : 'None detected'),
              })),
            );
          } else {
            setTopicAnalytics([]);
          }
        }
      } catch (e) {
        console.error('Error fetching analytics summary:', e);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchSummary();
  }, [selectedCourseId, selectedDivision]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'HEALTHY':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      case 'NEEDS_REINFORCEMENT':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'UNTESTED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      default:
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    }
  };

  const [sendingNudge, setSendingNudge] = useState<boolean>(false);

  const handleSendNudge = async () => {
    const currentCourse = coursesList.find((c) => c.id === selectedCourseId) || coursesList[0];
    const topicId = summaryData?.bottleneckTopics?.[0]?.topicId || currentCourse?.topics?.[0]?.id;
    const topicName = summaryData?.bottleneckTopics?.[0]?.topicName || 'Arrays';

    setSendingNudge(true);
    try {
      const res: any = await api.post('/analytics/faculty/dispatch-remediation-nudge', {
        courseId: selectedCourseId,
        topicId: topicId,
        division: selectedDivision,
      });
      alert(
        res?.message ||
          `Automated remediation practice session successfully dispatched for "${topicName}" to ${res?.count || 1} students needing reinforcement.`,
      );
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch remediation nudge.');
    } finally {
      setSendingNudge(false);
    }
  };

  const topMastery = summaryData?.masteryDistribution?.topMastery;
  const proficient = summaryData?.masteryDistribution?.proficient;
  const developing = summaryData?.masteryDistribution?.developing;
  const atRisk = summaryData?.masteryDistribution?.atRisk;
  const currentCourse = coursesList.find((c) => c.id === selectedCourseId) || coursesList[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Curriculum & Class Learning Intelligence Analytics"
          subtitle="Longitudinal mastery tracking, psychometric misconception heatmaps & student distribution"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Class Performance Intelligence
                </h2>
                {coursesList.length > 0 && (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 outline-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition"
                  >
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 outline-none cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                >
                  {availableDivisions.map((div) => (
                    <option key={div} value={div} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {div}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Department of {summaryData?.departmentName || 'Computer Science & Engineering'} • CSPIT Semester {summaryData?.semester || 5} • {selectedDivision}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendNudge}
                disabled={sendingNudge}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {sendingNudge ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{sendingNudge ? 'Dispatching Nudge...' : 'Dispatch Topic Remediation Nudge'}</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Enrolled Cohort"
              value={(summaryData?.enrolledStudentsCount ?? 0).toString()}
              subtitle={selectedDivision === 'All Divisions' ? 'Enrolled Batch Students' : `${selectedDivision} Students`}
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Class Avg Mastery"
              value={`${summaryData?.overallClassMastery ?? 0}%`}
              subtitle={
                (summaryData?.activeAssessedCount ?? 0) === 0
                  ? 'Awaiting student practice sessions'
                  : 'EWMA Knowledge Curve'
              }
              icon={TrendingUp}
              trend={{
                value:
                  (summaryData?.activeAssessedCount ?? 0) === 0
                    ? '0 assessed learners'
                    : `${summaryData?.overallClassMastery ?? 0}% active baseline`,
                isPositive: (summaryData?.overallClassMastery ?? 0) >= 50,
              }}
              color="emerald"
            />
            <MetricCard
              title="Misconception Flags"
              value={`${summaryData?.misconceptionFlagsCount ?? 0} Topics`}
              subtitle={
                (summaryData?.activeAssessedCount ?? 0) === 0
                  ? '0 Diagnostics Logged'
                  : (summaryData?.misconceptionFlagsCount ?? 0) > 0
                  ? 'Intervention Recommended'
                  : 'Optimal Knowledge Health'
              }
              icon={AlertTriangle}
              color="rose"
            />
            <MetricCard
              title="Practice Adherence"
              value={`${summaryData?.practiceAdherence ?? 0}%`}
              subtitle={
                (summaryData?.activeAssessedCount ?? 0) === 0
                  ? 'No practice activity logged'
                  : `${summaryData?.activeAssessedCount} Active of ${summaryData?.enrolledStudentsCount}`
              }
              icon={CheckCircle2}
              color="blue"
            />
          </div>

          {/* Student Mastery Quartile Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cohort Knowledge Distribution (Quartiles)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Breakdown of {summaryData?.activeAssessedCount || summaryData?.enrolledStudentsCount || 0} active students grouped by current estimated knowledge ability
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                  Top Mastery (80-100%)
                </span>
                <span className="text-2xl font-black text-emerald-950 dark:text-white mt-1 block">
                  {topMastery?.count ?? 0} Students ({topMastery?.percentage ?? 0}%)
                </span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Ready for advanced competitive coding</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase block">
                  Proficient (60-80%)
                </span>
                <span className="text-2xl font-black text-blue-950 dark:text-white mt-1 block">
                  {proficient?.count ?? 0} Students ({proficient?.percentage ?? 0}%)
                </span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">Consistent knowledge baseline met</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                  Developing (40-60%)
                </span>
                <span className="text-2xl font-black text-amber-950 dark:text-white mt-1 block">
                  {developing?.count ?? 0} Students ({developing?.percentage ?? 0}%)
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  {(summaryData?.activeAssessedCount ?? 0) === 0
                    ? 'No active developing flags'
                    : summaryData?.bottleneckTopics?.[0]?.topicName
                    ? `Targeted practice needed in ${summaryData.bottleneckTopics[0].topicName}`
                    : 'Balanced distribution'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase block">
                  At-Risk (&lt; 40%)
                </span>
                <span className="text-2xl font-black text-rose-950 dark:text-white mt-1 block">
                  {atRisk?.count ?? 0} Students ({atRisk?.percentage ?? 0}%)
                </span>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                  {(summaryData?.activeAssessedCount ?? 0) === 0
                    ? '0 active intervention alerts'
                    : `Counsellor alerts active for ${summaryData?.atRiskStudents?.length ?? 0} students`}
                </p>
              </div>
            </div>
          </div>

          {/* Topic-by-Topic Mastery Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Curriculum Topic Mastery &amp; Struggle Heatmap
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identifies conceptual bottlenecks and recurring distractor trap patterns
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Curriculum Topic</th>
                    <th className="p-4">Cohort Mastery</th>
                    <th className="p-4">Total Attempts</th>
                    <th className="p-4">Struggle Rate</th>
                    <th className="p-4">Health Status</th>
                    <th className="p-4">Primary Misconception Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {loadingAnalytics ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Calculating live cohort analytics...</span>
                        </div>
                      </td>
                    </tr>
                  ) : topicAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No topic mastery records logged yet for this cohort.
                      </td>
                    </tr>
                  ) : (
                    topicAnalytics.map((t) => (
                    <tr key={t.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white w-10">{t.avgMastery}%</span>
                          <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.status === 'UNTESTED' || t.attemptCount === 0
                                  ? 'bg-slate-300 dark:bg-slate-700'
                                  : t.avgMastery >= 75
                                  ? 'bg-emerald-500'
                                  : t.avgMastery >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${t.avgMastery}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{t.attemptCount}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {t.attemptCount === 0 ? '0%' : `${t.struggleRate}%`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadge(t.status)}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                        {t.topMisconception}
                      </td>
                    </tr>
                  ))
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
