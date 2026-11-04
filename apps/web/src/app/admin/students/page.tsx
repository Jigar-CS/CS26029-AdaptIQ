'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { CsvImportModal } from '@/components/CsvImportModal';
import { CounsellorAssignmentModal } from '@/components/CounsellorAssignmentModal';
import { UserRole } from '@clias/shared-types';
import {
  Users,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Search,
  Download,
  Building2,
  BookOpen,
  Filter,
  Plus,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface AuthorizedStudent {
  id: string;
  enrollmentNumber: string;
  name: string;
  email: string;
  institute: string;
  department: string;
  programName: string;
  semester: number;
  division: string;
  graduationYear: number;
  activated: boolean;
}

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>({
    totalAuthorizedStudents: 0,
    activatedStudents: 0,
    activationRate: 0,
    totalQuestionsInBank: 0,
  });
  const [students, setStudents] = useState<AuthorizedStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVATED' | 'PENDING'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCounsellorModalOpen, setIsCounsellorModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== UserRole.SUPER_ADMIN)) {
      router.push('/auth/login');
      return;
    }

    if (user && user.role === UserRole.SUPER_ADMIN) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [statsRes, studentsRes]: any = await Promise.all([
        api.get('/admin/dashboard').catch(() => null),
        api.get('/admin/students?limit=200').catch(() => null),
      ]);
      if (statsRes) setStats(statsRes);
      const list = Array.isArray(studentsRes)
        ? studentsRes
        : Array.isArray(studentsRes?.data)
        ? studentsRes.data
        : [];
      setStudents(list);
    } catch {
      setStudents([]);
    }
  };

  const availableDivisions = ['ALL', ...Array.from(new Set(students.map((s) => s.division).filter(Boolean))).sort()];

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.name?.toLowerCase().includes(term) ||
      s.enrollmentNumber?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVATED' && s.activated) ||
      (statusFilter === 'PENDING' && !s.activated);

    const matchesDiv = divisionFilter === 'ALL' || s.division === divisionFilter;

    return matchesSearch && matchesStatus && matchesDiv;
  });

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Student Registry & Authorization Whitelist"
          subtitle="Authorized student identities, CSV bulk roster ingestion & activation management"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Page Intro Banner */}
          <div className="page-intro">
            <div>
              <h1 className="page-title display">
                AUTHORIZED <span className="coral">STUDENTS.</span>
              </h1>
            </div>
            <div className="readiness">
              <p className="mono">ACTIVATION RATE</p>
              <strong>
                {stats?.activationRate || (students.length > 0 ? Math.round((students.filter((s) => s.activated).length / students.length) * 100) : 0)}
                <span>%</span>
              </strong>
              <p className="mono blue">OFFICIAL REGISTRY PROXY</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metrics Bar */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span>+ALL</span></div>
              <div className="metric-value">{stats?.totalAuthorizedStudents || students.length}</div>
              <div className="metric-label mono">AUTHORIZED ROSTER</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="coral">ACTIVE</span></div>
              <div className="metric-value">{stats?.activatedStudents || students.filter((s) => s.activated).length}</div>
              <div className="metric-label mono">ACTIVATED ACCOUNTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>PROGRESS</span></div>
              <div className="metric-value">{stats?.activationRate || Math.round((students.filter((s) => s.activated).length / Math.max(students.length, 1)) * 100)}%</div>
              <div className="metric-label mono">ACTIVATION RATE</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="blue">BANK</span></div>
              <div className="metric-value">{stats?.totalQuestionsInBank ?? 0}</div>
              <div className="metric-label mono">ITEM BANK ITEMS</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band Callout */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <p className="mono">INSTITUTIONAL REGISTRY / ACTIONS</p>
              <h2 className="display">MANAGE ENROLLMENT &amp; ASSIGN COUNSELLORS</h2>
              <p>Import official student batches via CSV or synchronize counsellor assignments across degree programs.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCounsellorModalOpen(true)}
                className="action-button bg-transparent border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--accent)]"
              >
                <span>ASSIGN COUNSELLORS</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="action-button bg-[#e05033] text-white hover:bg-[#c8432b]"
              >
                <span>IMPORT CSV →</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 min-w-0">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, enrollment # (24CS001), email, or department..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 font-medium transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">Status:</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['ALL', 'ACTIVATED', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Records' : st === 'ACTIVATED' ? 'Activated' : 'Pending'}
                  </button>
                ))}
              </div>

              {/* Division Filter Dropdown / Pills */}
              {availableDivisions.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Division:</span>
                  </div>

                  {availableDivisions.length <= 4 ? (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                      {availableDivisions.map((div) => {
                        const label = div === 'ALL' ? 'All Div' : div.toLowerCase().startsWith('div') ? div : `Div ${div}`;
                        return (
                          <button
                            key={div}
                            onClick={() => setDivisionFilter(div)}
                            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                              divisionFilter === div
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={divisionFilter}
                        onChange={(e) => setDivisionFilter(e.target.value)}
                        className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs max-w-[220px] truncate"
                      >
                        <option value="ALL">All Divisions ({students.length})</option>
                        {availableDivisions
                          .filter((d) => d !== 'ALL')
                          .map((div) => {
                            const count = students.filter((s) => s.division === div).length;
                            const label = div.toLowerCase().startsWith('div') ? div : `Div ${div}`;
                            return (
                              <option key={div} value={div}>
                                {label} ({count})
                              </option>
                            );
                          })}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Authorized Student Records
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredStudents.length} of {students.length} authorized students
                </p>
              </div>
            </div>

            {/* Desktop Tabular View (hidden on mobile) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Enrollment #</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">University Email</th>
                    <th className="p-4">Institute &amp; Dept</th>
                    <th className="p-4">Program</th>
                    <th className="p-4">Cohort</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.enrollmentNumber}
                        </td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          {s.name}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {s.email}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                            {s.institute} • {s.department}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {s.programName}
                        </td>
                        <td className="p-4">
                          Sem {s.semester}, Div {s.division} ({s.graduationYear})
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.activated
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {s.activated ? 'Activated' : 'Pending Activation'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No matching student records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Student Cards (visible on < md screens) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {s.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {s.enrollmentNumber}
                          </span>
                          <span className="text-slate-400 truncate">
                            {s.email}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 border ${
                          s.activated
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {s.activated ? 'Activated' : 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                          {s.institute} • {s.department}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cohort & Class</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                          Sem {s.semester} • Div {s.division}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="truncate">{s.programName}</span>
                      <span className="font-mono font-semibold shrink-0">Class of {s.graduationYear}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching student records found.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Counsellor Allocation Modal */}
      <CounsellorAssignmentModal
        isOpen={isCounsellorModalOpen}
        onClose={() => setIsCounsellorModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
