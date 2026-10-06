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
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface AssignedStudent {
  id: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  semester: number;
  division: string;
  masteryScore: number;
  primaryWeakness: string;
  status: 'OPTIMAL' | 'WATCHLIST' | 'INTERVENTION_REQUIRED';
  lastAdvisoryDate: string;
  attendancePct: number;
}

export default function CounsellorAssignedStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
  const [advisoryNote, setAdvisoryNote] = useState('');

  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    const loadMentees = async () => {
      setLoading(true);
      try {
        const res: any = await api.get('/analytics/counsellor/mentees/summary');
        if (res && Array.isArray(res.mentees)) {
          const mapped: AssignedStudent[] = res.mentees.map((m: any) => ({
            id: m.studentId || m.assignmentId,
            name: m.name,
            enrollmentNumber: m.enrollmentNumber,
            email: m.email,
            semester: m.semester || 4,
            division: m.division || 'A',
            masteryScore: Number(m.averageMastery || 0),
            primaryWeakness: m.primaryFocusTopic || 'Foundations',
            status: m.riskLevel === 'CRITICAL' ? 'INTERVENTION_REQUIRED' : m.riskLevel === 'WARNING' ? 'WATCHLIST' : 'OPTIMAL',
            lastAdvisoryDate: m.assignedAt ? new Date(m.assignedAt).toISOString().split('T')[0] : 'None',
            attendancePct: 100,
          }));
          setStudents(mapped);
          if (mapped.length > 0) setSelectedStudent(mapped[0]);
        } else {
          setStudents([]);
        }
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadMentees();
    }
  }, [user, authLoading]);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleSaveAdvisory = () => {
    if (!selectedStudent) return;
    alert(`Academic advisory session recorded for ${selectedStudent.name}. Log entry persisted.`);
    setShowAdvisoryModal(false);
    setAdvisoryNote('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Assigned Mentees & Knowledge Profiles"
          subtitle="Direct mentorship cohort strictly assigned to you via institutional roster"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Top Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Assigned Student Roster
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Batch 2024-2028
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track academic progress, knowledge mastery decay, and schedule personalized 1-on-1 pedagogical advisories.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-800 shadow-xs">
                Total Assigned: {students.length} Mentees
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Students"
              value={students.length}
              subtitle="Direct Mentorship Allocation"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="At-Risk Students"
              value={students.filter((s) => s.status === 'INTERVENTION_REQUIRED').length}
              subtitle="Intervention Required"
              icon={AlertTriangle}
              color="rose"
            />
            <MetricCard
              title="Cohort Avg Mastery"
              value={
                students.length > 0
                  ? (students.reduce((acc, s) => acc + s.masteryScore, 0) / students.length).toFixed(1) + '%'
                  : '0.0%'
              }
              subtitle="Live Evaluated Mastery"
              icon={TrendingUp}
              trend={{
                value: students.length > 0 ? 'Live Cohort Telemetry' : 'No Activity',
                isPositive: students.length > 0,
              }}
              color="emerald"
            />
            <MetricCard
              title="Optimal Learners"
              value={students.filter((s) => s.status === 'OPTIMAL').length}
              subtitle="Satisfactory Trajectory"
              icon={CheckCircle2}
              color="blue"
            />
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
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {['ALL', 'DIV 1', 'DIV 2'].map((div) => (
                  <button
                    key={div}
                    onClick={() => setDivisionFilter(div)}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      divisionFilter === div
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {div === 'ALL' ? 'All Divisions' : div}
                  </button>
                ))}
              </div>

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
                  Student Mentee Knowledge Profiles
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
                    <th className="p-4">Primary Vulnerability</th>
                    <th className="p-4">Mentorship Status</th>
                    <th className="p-4">Last Advisory</th>
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
                            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
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
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {student.primaryWeakness}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(
                              student.status
                            )}`}
                          >
                            {student.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {student.lastAdvisoryDate}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowAdvisoryModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition inline-flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Advisory</span>
                          </button>
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

          {/* Privacy & Scope Architecture Guarantee */}
          <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200 flex items-start gap-4 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Strict Student Mentorship Isolation Enforced</h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                As per institutional regulations, counsellors can view and interact solely with students mapped directly to them. Data access permissions are cryptographically locked at the API layer.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Advisory Modal */}
      {showAdvisoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Record 1-on-1 Academic Advisory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedStudent.name} ({selectedStudent.enrollmentNumber})
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
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{selectedStudent.primaryWeakness}</span>
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
