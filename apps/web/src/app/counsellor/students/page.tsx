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
  Search,
  Filter,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Calendar,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Eye,
  Activity,
  FileText,
  X,
  Lock,
  AlertCircle,
  Award,
  Clock,
  Layers,
  BarChart3,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

interface AssignedStudent {
  id: string;
  studentId: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  programName?: string;
  semester: number;
  division: string;
  masteryScore: number;
  primaryWeakness: string;
  status: 'OPTIMAL' | 'WATCHLIST' | 'INTERVENTION_REQUIRED';
  lastAdvisoryDate: string;
  attendancePct: number;
  practice: {
    totalSessions: number;
    questionsAttempted: number;
    correctAnswers: number;
    accuracy: number;
    recentSessions: Array<{
      id: string;
      courseName: string;
      difficulty?: string;
      startedAt: string;
      completedAt?: string;
      questionsAttempted: number;
      correctAnswers: number;
    }>;
  };
  progress: {
    averageMastery: number;
    topicBreakdown: Array<{
      topicId: string;
      topicName: string;
      score: number;
      attemptCount: number;
      correctCount: number;
      retentionStatus: string;
      lastPracticedAt?: string;
    }>;
    decayingTopics: string[];
  };
  violations: {
    latestTrustScore: number;
    totalViolations: number;
    flaggedSessionsCount: number;
    proctoringSessionsCount: number;
    violationsList: Array<{
      id: string;
      type: string;
      severity: string;
      confidence?: number;
      details: string;
      timestamp: string;
    }>;
    recentSessions: Array<{
      id: string;
      trustScore: number;
      violationsCount: number;
      status: string;
      createdAt: string;
    }>;
  };
  assessments: {
    totalTaken: number;
    passedCount: number;
    recentSubmissions: Array<{
      id: string;
      title: string;
      code: string;
      score: number;
      percentage: number;
      passed: boolean;
      status: string;
      createdAt: string;
    }>;
  };
  alerts: any[];
}

export default function CounsellorAssignedStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedStudentForAdvisory, setSelectedStudentForAdvisory] = useState<AssignedStudent | null>(null);
  const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
  const [advisoryNote, setAdvisoryNote] = useState('');

  const [detailStudent, setDetailStudent] = useState<AssignedStudent | null>(null);
  const [detailTab, setDetailTab] = useState<'practice' | 'progress' | 'violations' | 'assessments' | 'advisory'>('practice');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HOD && !user.isCounsellor))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadMentees();
    }
  }, [user, authLoading]);

  const loadMentees = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/analytics/counsellor/mentees/summary');
      if (res && Array.isArray(res.mentees)) {
        const mapped: AssignedStudent[] = res.mentees.map((m: any) => ({
          id: m.assignmentId || m.studentId,
          studentId: m.studentId,
          name: m.name,
          enrollmentNumber: m.enrollmentNumber,
          email: m.email,
          programName: m.programName,
          semester: m.semester || 5,
          division: m.division || 'A',
          masteryScore: Number(m.averageMastery || 0),
          primaryWeakness: m.primaryFocusTopic || 'Foundations',
          status:
            m.riskLevel === 'CRITICAL'
              ? 'INTERVENTION_REQUIRED'
              : m.riskLevel === 'WARNING'
              ? 'WATCHLIST'
              : 'OPTIMAL',
          lastAdvisoryDate: m.assignedAt ? new Date(m.assignedAt).toISOString().split('T')[0] : 'None',
          attendancePct: 100,

          // Deep Practice Telemetry
          practice: m.practice || {
            totalSessions: 0,
            questionsAttempted: m.questionsAttempted || 0,
            correctAnswers: 0,
            accuracy: m.accuracy || 0,
            recentSessions: [],
          },

          // Deep Progress Telemetry
          progress: m.progress || {
            averageMastery: m.averageMastery || 0,
            topicBreakdown: [],
            decayingTopics: [],
          },

          // Deep Proctoring Violations Telemetry
          violations: m.violations || {
            latestTrustScore: 100,
            totalViolations: 0,
            flaggedSessionsCount: 0,
            proctoringSessionsCount: 0,
            violationsList: [],
            recentSessions: [],
          },

          // Assessment Submissions Telemetry
          assessments: m.assessments || {
            totalTaken: 0,
            passedCount: 0,
            recentSubmissions: [],
          },

          alerts: m.alerts || [],
        }));

        setStudents(mapped);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(term) ||
      s.enrollmentNumber.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term);
    const matchesDivision = divisionFilter === 'ALL' || s.division === divisionFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'OPTIMAL':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'WATCHLIST':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  const availableDivisions = ['ALL', ...Array.from(new Set(students.map((s) => s.division).filter(Boolean)))];

  const handleSaveAdvisory = async () => {
    const targetStudent = selectedStudentForAdvisory || detailStudent;
    if (!targetStudent || !advisoryNote.trim()) return;
    try {
      await api.post('/analytics/counsellor/advisory', {
        studentId: targetStudent.studentId,
        notes: advisoryNote,
        targetArea: targetStudent.primaryWeakness,
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === targetStudent.id
            ? {
                ...s,
                lastAdvisoryDate: new Date().toISOString().split('T')[0],
                status: s.status === 'INTERVENTION_REQUIRED' ? 'WATCHLIST' : s.status,
              }
            : s,
        ),
      );
      if (detailStudent && detailStudent.id === targetStudent.id) {
        setDetailStudent({
          ...detailStudent,
          lastAdvisoryDate: new Date().toISOString().split('T')[0],
        });
      }
      setShowAdvisoryModal(false);
      setAdvisoryNote('');
      alert('1-on-1 Academic Advisory record logged successfully.');
    } catch (err: any) {
      alert(err?.message || 'Failed to record advisory session.');
    }
  };

  // Aggregated Cohort Summary Metrics
  const totalAssigned = students.length;
  const totalAtRisk = students.filter((s) => s.status === 'INTERVENTION_REQUIRED').length;
  const totalPracticeQuestions = students.reduce((sum, s) => sum + s.practice.questionsAttempted, 0);
  const totalCohortViolations = students.reduce((sum, s) => sum + s.violations.totalViolations, 0);
  const avgTrust =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.violations.latestTrustScore, 0) / students.length)
      : 100;

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Assigned Mentees & Knowledge Profiles"
          subtitle="Direct mentorship cohort strictly assigned to you via institutional roster"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Page Intro Banner */}
          <div className="page-intro">
            <div>
              <h1 className="page-title display">
                ASSIGNED <span className="coral">MENTEES.</span>
              </h1>
            </div>
            <div className="readiness">
              <p className="mono">COHORT TRUST</p>
              <strong>
                {avgTrust}
                <span>%</span>
              </strong>
              <p className="mono blue">{totalAtRisk > 0 ? `${totalAtRisk} AT-RISK STUDENTS` : 'ALL MENTEES ON TRACK'}</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metrics Bar */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span>ALLOCATED</span></div>
              <div className="metric-value">{totalAssigned}</div>
              <div className="metric-label mono">ASSIGNED MENTEES</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="coral">PRACTICE</span></div>
              <div className="metric-value">{totalPracticeQuestions}</div>
              <div className="metric-label mono">QUESTIONS SOLVED</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>AUDIT</span></div>
              <div className="metric-value">{avgTrust}%</div>
              <div className="metric-label mono">PROCTORING TRUST AVG</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="coral">ACTION</span></div>
              <div className="metric-value">{totalAtRisk}</div>
              <div className="metric-label mono">INTERVENTION REQUIRED</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band Callout */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
             
              <h2 className="display">DIRECT MENTEE COHORT MONITORING</h2>
              <p>Continuous academic progress telemetry, live practice tracking, and AI proctoring integrity auditing strictly for your assigned students.</p>
            </div>
            <span className="font-mono text-xs px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] uppercase tracking-wider shrink-0">
              {students.length} Mentees Active
            </span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, enrollment no (e.g. 24CS001)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Division:</span>
              </div>
              {availableDivisions.length <= 4 ? (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  {availableDivisions.map((div) => (
                    <button
                      key={div}
                      onClick={() => setDivisionFilter(div)}
                      className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                        divisionFilter === div
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {div === 'ALL' ? 'All Divisions' : div.toLowerCase().startsWith('div') ? div : `Div ${div}`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value)}
                    className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs max-w-[200px] truncate"
                  >
                    <option value="ALL">All Divisions</option>
                    {availableDivisions
                      .filter((d) => d !== 'ALL')
                      .map((div) => {
                        const label = div.toLowerCase().startsWith('div') ? div : `Div ${div}`;
                        return (
                          <option key={div} value={div}>
                            {label}
                          </option>
                        );
                      })}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {['ALL', 'INTERVENTION_REQUIRED', 'OPTIMAL'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st === 'INTERVENTION_REQUIRED' ? 'At-Risk' : 'Optimal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Student Mentee Knowledge & Telemetry Profiles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredStudents.length} of {students.length} authorized mentees
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Student & Enrollment</th>
                    <th className="p-4">Cohort</th>
                    <th className="p-4">Overall Mastery</th>
                    <th className="p-4">Practice Activity</th>
                    <th className="p-4">Proctoring Trust & Flags</th>
                    <th className="p-4">Mentorship Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Loading authorized mentee roster...
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs">{student.name}</p>
                              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{student.enrollmentNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Sem {student.semester}
                          </span>
                          <span className="text-slate-400 ml-1 font-normal">• {student.division}</span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 max-w-[120px]">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-slate-900 dark:text-white">{student.masteryScore}%</span>
                              <span className="text-slate-400 text-[10px]">BKT</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  student.masteryScore >= 75
                                    ? 'bg-emerald-500'
                                    : student.masteryScore >= 60
                                    ? 'bg-blue-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${student.masteryScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {student.practice.totalSessions} sessions ({student.practice.questionsAttempted} Qs)
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              Accuracy: {student.practice.accuracy}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-mono font-bold rounded-lg border ${
                                student.violations.latestTrustScore >= 80
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : student.violations.latestTrustScore >= 60
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {student.violations.latestTrustScore}% Trust
                            </span>
                            {student.violations.totalViolations > 0 ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                {student.violations.totalViolations} Flags
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Clean
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(
                              student.status,
                            )}`}
                          >
                            {student.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setDetailStudent(student);
                                setDetailTab('practice');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition inline-flex items-center gap-1.5"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>View Telemetry</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudentForAdvisory(student);
                                setShowAdvisoryModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                              title="Record Advisory"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No students match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </main>
      </div>

      {/* 360-Degree Comprehensive Student Telemetry Modal */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                  {detailStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{detailStudent.name}</h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {detailStudent.enrollmentNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(
                        detailStudent.status,
                      )}`}
                    >
                      {detailStudent.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {detailStudent.email} • Sem {detailStudent.semester} Division {detailStudent.division} {detailStudent.programName ? `• ${detailStudent.programName}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto text-xs">
              <button
                onClick={() => setDetailTab('practice')}
                className={`px-4 py-2.5 font-bold border-b-2 transition flex items-center gap-2 ${
                  detailTab === 'practice'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Practice Activity ({detailStudent.practice.totalSessions})</span>
              </button>

              <button
                onClick={() => setDetailTab('progress')}
                className={`px-4 py-2.5 font-bold border-b-2 transition flex items-center gap-2 ${
                  detailTab === 'progress'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Concept Mastery ({detailStudent.progress.topicBreakdown.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('violations')}
                className={`px-4 py-2.5 font-bold border-b-2 transition flex items-center gap-2 ${
                  detailTab === 'violations'
                    ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Proctoring & Violations ({detailStudent.violations.totalViolations})</span>
              </button>

              <button
                onClick={() => setDetailTab('assessments')}
                className={`px-4 py-2.5 font-bold border-b-2 transition flex items-center gap-2 ${
                  detailTab === 'assessments'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Assessments ({detailStudent.assessments.totalTaken})</span>
              </button>

              <button
                onClick={() => setDetailTab('advisory')}
                className={`px-4 py-2.5 font-bold border-b-2 transition flex items-center gap-2 ${
                  detailTab === 'advisory'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Record Advisory</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: PRACTICE ACTIVITY */}
              {detailTab === 'practice' && (
                <div className="space-y-6">
                  {/* Practice KPI metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Practice Sessions</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {detailStudent.practice.totalSessions}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Questions Attempted</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {detailStudent.practice.questionsAttempted}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Correct Answers</span>
                      <span className="text-2xl font-black text-emerald-500">
                        {detailStudent.practice.correctAnswers}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Practice Accuracy</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {detailStudent.practice.accuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Recent Practice Sessions List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      <span>Recent Practice Sessions</span>
                    </h4>

                    {detailStudent.practice.recentSessions && detailStudent.practice.recentSessions.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] text-slate-400">
                            <tr>
                              <th className="p-3">Course / Domain</th>
                              <th className="p-3">Difficulty</th>
                              <th className="p-3">Questions Solved</th>
                              <th className="p-3">Session Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {detailStudent.practice.recentSessions.map((session, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                  {session.courseName}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {session.difficulty || 'ADAPTIVE'}
                                  </span>
                                </td>
                                <td className="p-3 text-emerald-500 font-bold">
                                  {session.correctAnswers} / {session.questionsAttempted} correct
                                </td>
                                <td className="p-3 text-slate-400 font-mono text-[11px]">
                                  {new Date(session.startedAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                        No recent practice sessions recorded yet for this student.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PROGRESS & TOPIC MASTERY */}
              {detailTab === 'progress' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">
                        Overall BKT Evaluated Mastery: {detailStudent.masteryScore}%
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Primary Concept Vulnerability: <strong className="text-rose-500">{detailStudent.primaryWeakness}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span>Topic Skill Masteries & Retention Status</span>
                    </h4>

                    {detailStudent.progress.topicBreakdown && detailStudent.progress.topicBreakdown.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {detailStudent.progress.topicBreakdown.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">{t.topicName}</span>
                              <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                                {t.score}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  t.score >= 75
                                    ? 'bg-emerald-500'
                                    : t.score >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${t.score}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span>{t.attemptCount} practice attempts ({t.correctCount} correct)</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                  t.retentionStatus === 'RETAINED'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : t.retentionStatus === 'DECAYING'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-rose-500/10 text-rose-500'
                                }`}
                              >
                                {t.retentionStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                        No topic masteries recorded yet for this student.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PROCTORING VIOLATIONS & INTEGRITY */}
              {detailTab === 'violations' && (
                <div className="space-y-6">
                  {/* Trust Score Banner */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                        AI Proctoring Integrity Index
                      </span>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Latest Trust Score:</span>
                        <span
                          className={`font-mono ${
                            detailStudent.violations.latestTrustScore >= 80
                              ? 'text-emerald-500'
                              : detailStudent.violations.latestTrustScore >= 60
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {detailStudent.violations.latestTrustScore}%
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Evaluated across {detailStudent.violations.proctoringSessionsCount} formal proctored exam sessions.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800/80 text-center">
                        <span className="text-[10px] text-slate-400 block font-medium">Total Flags</span>
                        <span className="text-lg font-black text-rose-500">
                          {detailStudent.violations.totalViolations}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800/80 text-center">
                        <span className="text-[10px] text-slate-400 block font-medium">Flagged Sessions</span>
                        <span className="text-lg font-black text-amber-500">
                          {detailStudent.violations.flaggedSessionsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Violations Itemized Feed */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span>Itemized Proctoring Violations Log ({detailStudent.violations.violationsList.length})</span>
                    </h4>

                    {detailStudent.violations.violationsList && detailStudent.violations.violationsList.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {detailStudent.violations.violationsList.map((v, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 uppercase">
                                  {v.type}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  Severity: {v.severity}
                                </span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{v.details}</p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(v.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <span>Clean proctoring audit history — No integrity violations logged for this mentee.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ASSESSMENTS & EXAMS */}
              {detailTab === 'assessments' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-500" />
                      <span>Formal Assessment Submissions ({detailStudent.assessments.totalTaken})</span>
                    </h4>

                    {detailStudent.assessments.recentSubmissions && detailStudent.assessments.recentSubmissions.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] text-slate-400">
                            <tr>
                              <th className="p-3">Assessment Title</th>
                              <th className="p-3">Score & Percentage</th>
                              <th className="p-3">Result</th>
                              <th className="p-3">Submitted At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {detailStudent.assessments.recentSubmissions.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                  {sub.title}
                                  <span className="font-mono text-[10px] text-slate-400 block">{sub.code}</span>
                                </td>
                                <td className="p-3 font-bold">
                                  {sub.score} marks ({sub.percentage}%)
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      sub.passed
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-rose-500/10 text-rose-500'
                                    }`}
                                  >
                                    {sub.passed ? 'PASSED' : 'RETAKE'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 font-mono text-[11px]">
                                  {new Date(sub.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                        No formal assessment submissions on record yet for this mentee.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: 1-ON-1 ADVISORY LOG */}
              {detailTab === 'advisory' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Record 1-on-1 Pedagogical Advisory
                    </span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Primary weakness area: <strong className="text-rose-500">{detailStudent.primaryWeakness}</strong>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Advisory Notes & Prescribed Study Plan:
                    </label>
                    <textarea
                      rows={4}
                      value={advisoryNote}
                      onChange={(e) => setAdvisoryNote(e.target.value)}
                      placeholder="Enter student challenges discussed, study targets, intervention prescribed, and scheduled follow-up..."
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-indigo-600 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAdvisory}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Log Advisory Entry</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Advisory Modal */}
      {showAdvisoryModal && selectedStudentForAdvisory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Record 1-on-1 Academic Advisory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedStudentForAdvisory.name} ({selectedStudentForAdvisory.enrollmentNumber})
                </p>
              </div>
              <button
                onClick={() => setShowAdvisoryModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Target Area: </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{selectedStudentForAdvisory.primaryWeakness}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Advisory Notes & Prescribed Actions:
                </label>
                <textarea
                  rows={4}
                  value={advisoryNote}
                  onChange={(e) => setAdvisoryNote(e.target.value)}
                  placeholder="Summarize discussion, student concerns, agreed study rhythm, and prescribed practice topics..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAdvisoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdvisory}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs"
              >
                Save Advisory Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
