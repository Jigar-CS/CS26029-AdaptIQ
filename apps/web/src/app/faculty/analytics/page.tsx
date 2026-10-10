'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { LearningCurveChart } from '@/components/LearningCurveChart';
import { UserRole } from '@clias/shared-types';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  BrainCircuit,
  Award,
  CheckCircle2,
  Send,
  Loader2,
  GraduationCap,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface TopicAnalytics {
  name: string;
  avgMastery: number;
  attemptCount: number;
  struggleRate: number;
  status: 'HEALTHY' | 'NEEDS_REINFORCEMENT' | 'CRITICAL_DEFICIENCY' | 'UNTESTED';
  topMisconception: string;
}

interface StudentListItem {
  id: string;
  studentProfileId: string | null;
  authorizedStudentId: string;
  enrollmentNumber: string;
  name: string;
  email: string;
  division: string;
  department: string;
  averageMastery: number;
  practiceAttemptsCount: number;
  assessmentsCount: number;
  totalActivityCount: number;
  status: string;
}

export default function FacultyClassAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation & View Mode: 'cohort' | 'student'
  const [activeView, setActiveView] = useState<'cohort' | 'student'>('cohort');

  // Course & Division Filters
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('CS Div 1');
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([
    'CS Div 1',
    'CS Div 2',
    'All Divisions',
  ]);

  // Cohort Telemetry
  const [summaryData, setSummaryData] = useState<any>(null);
  const [topicAnalytics, setTopicAnalytics] = useState<TopicAnalytics[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  // Student Deep-Dive State
  const [studentsList, setStudentsList] = useState<StudentListItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentData, setStudentData] = useState<any>(null);
  const [studentCurveData, setStudentCurveData] = useState<any[]>([]);
  const [studentSourceFilter, setStudentSourceFilter] = useState<string>('ALL');
  const [studentTopicFilter, setStudentTopicFilter] = useState<string>('ALL');
  const [loadingStudent, setLoadingStudent] = useState<boolean>(false);
  const [loadingCurve, setLoadingCurve] = useState<boolean>(false);

  // Remediation Nudge
  const [sendingNudge, setSendingNudge] = useState<boolean>(false);

  // 1. Initial Courses Load
  useEffect(() => {
    if (
      !authLoading &&
      (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN))
    ) {
      router.push('/auth/login');
      return;
    }

    const loadCourses = async () => {
      try {
        const courses: any = await api.get('/courses');
        if (courses && courses.length > 0) {
          setCoursesList(courses);
          const facultyCourseId = user?.courseId || user?.assignedCourse?.id;
          const active =
            (facultyCourseId && courses.find((c: any) => c.id === facultyCourseId)) ||
            courses.find((c: any) => c.code === 'CS301') ||
            courses[0];
          setSelectedCourseId(active.id);
        }
      } catch (e) {
        console.error('Error loading courses:', e);
      }
    };

    if (user) {
      loadCourses();
    }
  }, [user, authLoading, router]);

  // 2. Fetch Cohort Summary & Students List whenever Course or Division changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchCohortSummary = async () => {
      setLoadingAnalytics(true);
      try {
        const divParam =
          selectedDivision && selectedDivision !== 'All Divisions'
            ? `?division=${encodeURIComponent(selectedDivision)}`
            : '?division=ALL';
        const summary: any = await api.get(
          `/analytics/faculty/course/${selectedCourseId}/summary${divParam}`,
        );
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
                struggleRate: t.struggleRate ?? (t.totalAttempts > 0 ? Math.max(0, 100 - (t.accuracy ?? 0)) : 0),
                status:
                  t.status ||
                  (t.totalAttempts === 0
                    ? 'UNTESTED'
                    : t.classAverageMastery >= 70
                    ? 'HEALTHY'
                    : t.classAverageMastery >= 45
                    ? 'NEEDS_REINFORCEMENT'
                    : 'CRITICAL_DEFICIENCY'),
                topMisconception:
                  t.topMisconception ||
                  (t.totalAttempts === 0 ? 'No diagnostic attempts logged yet' : 'None detected'),
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

    const fetchStudents = async () => {
      try {
        const divParam =
          selectedDivision && selectedDivision !== 'All Divisions'
            ? `?division=${encodeURIComponent(selectedDivision)}`
            : '?division=ALL';
        const list: any = await api.get(
          `/analytics/faculty/course/${selectedCourseId}/students${divParam}`,
        );
        if (Array.isArray(list)) {
          setStudentsList(list);
          if (
            list.length > 0 &&
            (!selectedStudentId ||
              !list.some(
                (s: StudentListItem) =>
                  s.id === selectedStudentId || s.enrollmentNumber === selectedStudentId,
              ))
          ) {
            setSelectedStudentId(list[0].id || list[0].enrollmentNumber);
          }
        }
      } catch (e) {
        console.error('Error fetching student list:', e);
      }
    };

    fetchCohortSummary();
    fetchStudents();
  }, [selectedCourseId, selectedDivision]);

  // 3. Fetch Individual Student Analytics whenever selected student changes
  useEffect(() => {
    if (!selectedCourseId || !selectedStudentId || activeView !== 'student') return;

    const fetchStudentDetails = async () => {
      setLoadingStudent(true);
      try {
        const data: any = await api.get(
          `/analytics/faculty/course/${selectedCourseId}/student/${selectedStudentId}`,
        );
        if (data) {
          setStudentData(data);
          setStudentCurveData(Array.isArray(data.learningCurve) ? data.learningCurve : []);
          setStudentSourceFilter('ALL');
          setStudentTopicFilter('ALL');
        }
      } catch (err) {
        console.error('Failed to load student deep-dive analytics:', err);
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchStudentDetails();
  }, [selectedCourseId, selectedStudentId, activeView]);

  // 4. Handle Curve Filter Changes (Source & Topic)
  const handleSourceChange = async (newSource: string) => {
    setStudentSourceFilter(newSource);
    if (!selectedCourseId || !selectedStudentId) return;

    setLoadingCurve(true);
    try {
      const q = new URLSearchParams();
      if (newSource && newSource !== 'ALL') q.set('source', newSource);
      if (studentTopicFilter && studentTopicFilter !== 'ALL') q.set('topicId', studentTopicFilter);
      const queryStr = q.toString() ? `?${q.toString()}` : '';

      const curve: any = await api.get(
        `/analytics/faculty/course/${selectedCourseId}/student/${selectedStudentId}/learning-curve${queryStr}`,
      );
      if (Array.isArray(curve)) {
        setStudentCurveData(curve);
      }
    } catch (e) {
      console.error('Error filtering curve by source:', e);
    } finally {
      setLoadingCurve(false);
    }
  };

  const handleTopicChange = async (newTopic: string) => {
    setStudentTopicFilter(newTopic);
    if (!selectedCourseId || !selectedStudentId) return;

    setLoadingCurve(true);
    try {
      const q = new URLSearchParams();
      if (studentSourceFilter && studentSourceFilter !== 'ALL') q.set('source', studentSourceFilter);
      if (newTopic && newTopic !== 'ALL') q.set('topicId', newTopic);
      const queryStr = q.toString() ? `?${q.toString()}` : '';

      const curve: any = await api.get(
        `/analytics/faculty/course/${selectedCourseId}/student/${selectedStudentId}/learning-curve${queryStr}`,
      );
      if (Array.isArray(curve)) {
        setStudentCurveData(curve);
      }
    } catch (e) {
      console.error('Error filtering curve by topic:', e);
    } finally {
      setLoadingCurve(false);
    }
  };

  const handleInspectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveView('student');
  };

  const handleSendNudge = async () => {
    const currentCourse = coursesList.find((c) => c.id === selectedCourseId) || coursesList[0];
    const topicId = summaryData?.bottleneckTopics?.[0]?.topicId || currentCourse?.topics?.[0]?.id;
    const topicName = summaryData?.bottleneckTopics?.[0]?.topicName || 'Arrays';

    setSendingNudge(true);
    try {
      const res: any = await api.post('/analytics/faculty/dispatch-remediation-nudge', {
        courseId: selectedCourseId,
        topicId,
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

  const topMastery = summaryData?.masteryDistribution?.topMastery;
  const proficient = summaryData?.masteryDistribution?.proficient;
  const developing = summaryData?.masteryDistribution?.developing;
  const atRisk = summaryData?.masteryDistribution?.atRisk;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Curriculum & Class Learning Intelligence Analytics"
          subtitle="Longitudinal mastery tracking, psychometric misconception heatmaps & student distribution"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Banner & Mode Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {activeView === 'cohort'
                    ? 'Class Performance Intelligence'
                    : 'Student Learning Performance Deep-Dive'}
                </h2>
                {coursesList.length > 0 && (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 outline-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition"
                  >
                    {coursesList.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      >
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
                    <option
                      key={div}
                      value={div}
                      className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      {div}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Department of {summaryData?.departmentName || 'Computer Science & Engineering'} • CSPIT Semester {summaryData?.semester || 5} • {selectedDivision}
              </p>
            </div>

            {/* View Mode Toggle & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveView('cohort')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeView === 'cohort'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cohort Overview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('student')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeView === 'student'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Individual Student Deep-Dive</span>
                </button>
              </div>

              {activeView === 'cohort' && (
                <button
                  onClick={handleSendNudge}
                  disabled={sendingNudge}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {sendingNudge ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{sendingNudge ? 'Dispatching...' : 'Dispatch Nudge'}</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW MODE 1: COHORT OVERVIEW */}
          {activeView === 'cohort' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Enrolled Cohort"
                  value={(summaryData?.enrolledStudentsCount ?? 0).toString()}
                  subtitle={
                    selectedDivision === 'All Divisions'
                      ? 'Enrolled Batch Students'
                      : `${selectedDivision} Students`
                  }
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
                      Breakdown of{' '}
                      {summaryData?.activeAssessedCount ||
                        summaryData?.enrolledStudentsCount ||
                        0}{' '}
                      active students grouped by current estimated knowledge ability
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
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                      Ready for advanced competitive coding
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase block">
                      Proficient (60-80%)
                    </span>
                    <span className="text-2xl font-black text-blue-950 dark:text-white mt-1 block">
                      {proficient?.count ?? 0} Students ({proficient?.percentage ?? 0}%)
                    </span>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                      Consistent knowledge baseline met
                    </p>
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

              {/* Quick Student Roster Triage */}
              {studentsList.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <span>Enrolled Student Performance Roster</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select any student to inspect longitudinal learning curves and personalized telemetry
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {studentsList.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleInspectStudent(st.id)}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {st.enrollmentNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${getStatusBadge(
                                st.status,
                              )}`}
                            >
                              {st.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                            {st.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {st.division} • {st.practiceAttemptsCount} attempts • {st.assessmentsCount} tests
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Mastery:{' '}
                            <strong className="text-slate-900 dark:text-white font-extrabold">
                              {st.averageMastery}%
                            </strong>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                            <span>Deep-Dive</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          <tr
                            key={t.name}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition"
                          >
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              {t.name}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 dark:text-white w-10">
                                  {t.avgMastery}%
                                </span>
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
                            <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                              {t.attemptCount}
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                              {t.attemptCount === 0 ? '0%' : `${t.struggleRate}%`}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadge(
                                  t.status,
                                )}`}
                              >
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
            </div>
          )}

          {/* VIEW MODE 2: INDIVIDUAL STUDENT DEEP-DIVE */}
          {activeView === 'student' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Student Selector Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Select Student to Inspect
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Showing authorized students enrolled in {selectedDivision}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                  >
                    {studentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.enrollmentNumber} — {st.name} ({st.division})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingStudent ? (
                <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold">
                      Aggregating student learning curves and historical attempts...
                    </span>
                  </div>
                </div>
              ) : !studentData ? (
                <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium">Please select a student from the dropdown above.</p>
                </div>
              ) : (
                <>
                  {/* Student Details Banner */}
                  <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/80 dark:border-blue-900/60 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/20">
                        {studentData.student?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                            {studentData.student?.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {studentData.student?.enrollmentNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {studentData.student?.division}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {studentData.student?.department} • Semester {studentData.student?.semester} •{' '}
                          {studentData.student?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Mastery Velocity
                        </span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          {studentData.overview?.improvementTrend === 'IMPROVING' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Improving Trend</span>
                            </span>
                          ) : studentData.overview?.improvementTrend === 'DECLINING' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>Declining Trend</span>
                            </span>
                          ) : studentData.overview?.improvementTrend === 'STABLE' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Stable Velocity</span>
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              Awaiting Attempts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Telemetry Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <MetricCard
                      title="Overall Mastery"
                      value={`${studentData.overview?.overallMastery ?? 0}%`}
                      subtitle="EWMA Subject Level"
                      icon={BrainCircuit}
                      color="indigo"
                    />
                    <MetricCard
                      title="Practice Attempts"
                      value={(studentData.overview?.questionsPracticed ?? 0).toString()}
                      subtitle="Adaptive Practice"
                      icon={Target}
                      color="blue"
                    />
                    <MetricCard
                      title="Practice Accuracy"
                      value={`${studentData.overview?.practiceAccuracy ?? 0}%`}
                      subtitle="Diagnostic Precision"
                      icon={CheckCircle2}
                      color="emerald"
                    />
                    <MetricCard
                      title="Assessments Taken"
                      value={(studentData.overview?.assessmentsAttempted ?? 0).toString()}
                      subtitle="Formal Evaluations"
                      icon={Award}
                      color="purple"
                    />
                    <MetricCard
                      title="Assessment Average"
                      value={`${studentData.overview?.averageAssessmentScore ?? 0}%`}
                      subtitle="Evaluated Score Avg"
                      icon={TrendingUp}
                      color="amber"
                    />
                  </div>

                  {/* Two-Column Section: Learning Curve Chart + Strengths/Weaknesses Triage */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Knowledge Curve Progression */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Knowledge Curve Progression</span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Rolling smoothed trajectory (Beta=0.35, 50% prior) preventing single-attempt distortions
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Source Toggle */}
                          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => handleSourceChange('ALL')}
                              className={`px-2.5 py-1 rounded-lg transition-all ${
                                studentSourceFilter === 'ALL'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
                              }`}
                            >
                              Overall
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSourceChange('PRACTICE')}
                              className={`px-2.5 py-1 rounded-lg transition-all ${
                                studentSourceFilter === 'PRACTICE'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
                              }`}
                            >
                              Practice
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSourceChange('ASSESSMENT')}
                              className={`px-2.5 py-1 rounded-lg transition-all ${
                                studentSourceFilter === 'ASSESSMENT'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white'
                              }`}
                            >
                              Assessments
                            </button>
                          </div>

                          {/* Topic Filter */}
                          <select
                            value={studentTopicFilter}
                            onChange={(e) => handleTopicChange(e.target.value)}
                            className="p-1.5 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="ALL">All Topics</option>
                            {studentData.topicMasteries?.map((t: any) => (
                              <option key={t.topicId} value={t.topicId}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <LearningCurveChart
                        data={studentCurveData}
                        sourceFilter={studentSourceFilter}
                        topicFilter={studentTopicFilter}
                        isLoading={loadingCurve}
                      />
                    </div>

                    {/* Right: Strengths & Struggling Topics */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-rose-500" />
                          <span>Conceptual Mastery Triage</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                          Strengths (≥70%) vs Struggling areas needing remedial attention
                        </p>

                        {/* Struggling Topics */}
                        <div className="space-y-2 mb-5">
                          <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Remedial Attention Areas:</span>
                          </span>
                          {studentData.strugglingTopics && studentData.strugglingTopics.length > 0 ? (
                            studentData.strugglingTopics.map((wt: any) => (
                              <div
                                key={wt.topicId}
                                className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {wt.name}
                                  </p>
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-semibold">
                                    {wt.struggleRate}% Struggle Rate • {wt.attemptCount} Attempts
                                  </p>
                                </div>
                                <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400">
                                  {wt.masteryScore}%
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500 dark:text-slate-400">
                              No active struggle bottlenecks flagged for this student.
                            </div>
                          )}
                        </div>

                        {/* Strengths */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Demonstrated Strengths (≥70%):</span>
                          </span>
                          {studentData.strengths && studentData.strengths.length > 0 ? (
                            studentData.strengths.map((st: any) => (
                              <div
                                key={st.topicId}
                                className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {st.name}
                                  </p>
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                                    Mastered baseline met • {st.attemptCount} Attempts
                                  </p>
                                </div>
                                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                                  {st.masteryScore}%
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500 dark:text-slate-400">
                              Awaiting student attempts to establish verified strengths.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        {studentData.overview?.topicsMasteredCount} mastered of{' '}
                        {studentData.overview?.totalTopicsInCourse} course topics
                      </div>
                    </div>
                  </div>

                  {/* Recent Learning Activity Timeline */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>Actual Chronological Activity Log</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Verified timestamped practice attempts and official assessment submissions
                        </p>
                      </div>
                    </div>

                    {studentData.recentActivity && studentData.recentActivity.length > 0 ? (
                      <div className="space-y-2.5">
                        {studentData.recentActivity.map((act: any) => (
                          <div
                            key={act.id}
                            className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  act.type === 'PRACTICE'
                                    ? act.isCorrect
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                    : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
                                }`}
                              >
                                {act.type === 'PRACTICE' ? (act.isCorrect ? '✓' : '✗') : 'EX'}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">
                                  {act.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {act.topicName}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {act.type === 'ASSESSMENT' ? (
                                <span className="font-extrabold text-purple-700 dark:text-purple-400">
                                  Score: {act.score} pts
                                </span>
                              ) : (
                                <span
                                  className={`font-extrabold ${
                                    act.isCorrect
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {act.isCorrect ? 'Correct (+)' : 'Incorrect (-)'}
                                </span>
                              )}
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date(act.timestamp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No activity records logged yet for this student.
                      </div>
                    )}
                  </div>

                  {/* Student Topic-Wise Mastery Table */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Curriculum Topic-Wise Performance &amp; Struggle Breakdown
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Calculated from actual student practice attempts and evaluation answers
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-4">Curriculum Topic</th>
                            <th className="p-4">Student Mastery</th>
                            <th className="p-4">Total Attempts</th>
                            <th className="p-4">Accuracy Rate</th>
                            <th className="p-4">Struggle Rate</th>
                            <th className="p-4">Health Status</th>
                            <th className="p-4">Last Practiced</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                          {studentData.topicMasteries?.map((t: any) => (
                            <tr
                              key={t.topicId}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition"
                            >
                              <td className="p-4 font-bold text-slate-900 dark:text-white">
                                {t.name}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900 dark:text-white w-10">
                                    {t.masteryScore}%
                                  </span>
                                  <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        t.status === 'UNTESTED' || t.attemptCount === 0
                                          ? 'bg-slate-300 dark:bg-slate-700'
                                          : t.masteryScore >= 75
                                          ? 'bg-emerald-500'
                                          : t.masteryScore >= 50
                                          ? 'bg-blue-500'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${t.masteryScore}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                                {t.attemptCount}
                              </td>
                              <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                                {t.attemptCount === 0 ? '0%' : `${t.accuracy}%`}
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                                {t.attemptCount === 0 ? '0%' : `${t.struggleRate}%`}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadge(
                                    t.status,
                                  )}`}
                                >
                                  {t.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                                {t.lastPracticedAt
                                  ? new Date(t.lastPracticedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'Not yet practiced'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
