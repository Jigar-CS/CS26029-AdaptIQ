'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { CsvImportModal } from '@/components/CsvImportModal';
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

const SEED_STUDENTS: AuthorizedStudent[] = [
  {
    id: 's-1',
    enrollmentNumber: '24CS001',
    name: 'Rahul Patel',
    email: 'student@charusat.edu.in',
    institute: 'CSPIT',
    department: 'CSE',
    programName: 'B.Tech CSE',
    semester: 5,
    division: 'A',
    graduationYear: 2028,
    activated: true,
  },
  {
    id: 's-2',
    enrollmentNumber: '24CS002',
    name: 'Priya Sharma',
    email: 'priya@charusat.edu.in',
    institute: 'CSPIT',
    department: 'CSE',
    programName: 'B.Tech CSE',
    semester: 5,
    division: 'A',
    graduationYear: 2028,
    activated: false,
  },
  {
    id: 's-3',
    enrollmentNumber: '24CS003',
    name: 'Aarav Desai',
    email: 'aarav@charusat.edu.in',
    institute: 'CSPIT',
    department: 'CSE',
    programName: 'B.Tech CSE',
    semester: 5,
    division: 'B',
    graduationYear: 2028,
    activated: false,
  },
  {
    id: 's-4',
    enrollmentNumber: '24CS004',
    name: 'Ananya Shah',
    email: 'ananya@charusat.edu.in',
    institute: 'CSPIT',
    department: 'CSE',
    programName: 'B.Tech CSE',
    semester: 5,
    division: 'B',
    graduationYear: 2028,
    activated: false,
  },
  {
    id: 's-5',
    enrollmentNumber: '24CS005',
    name: 'Devansh Joshi',
    email: 'devansh@charusat.edu.in',
    institute: 'CSPIT',
    department: 'CSE',
    programName: 'B.Tech CSE',
    semester: 5,
    division: 'A',
    graduationYear: 2028,
    activated: false,
  },
];

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>({
    totalAuthorizedStudents: 5,
    activatedStudents: 1,
    activationRate: 20,
    totalQuestionsInBank: 25,
  });
  const [students, setStudents] = useState<AuthorizedStudent[]>(SEED_STUDENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVATED' | 'PENDING'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
        api.get('/admin/students?limit=50').catch(() => null),
      ]);
      if (statsRes) setStats(statsRes);
      if (studentsRes && Array.isArray(studentsRes.data) && studentsRes.data.length > 0) {
        setStudents(studentsRes.data);
      }
    } catch {
      // baseline active
    }
  };

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Student Registry & Authorization Whitelist"
          subtitle="Authorized student identities, CSV bulk roster ingestion & activation management"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Authorized Student Roster
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Official Registry Proxy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official institution database proxy for secure student registration, identity verification, and activation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition transform hover:-translate-y-0.5 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Import Students CSV</span>
              </button>
            </div>
          </div>

          {/* Metric Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Authorized Roster"
              value={stats?.totalAuthorizedStudents || students.length}
              subtitle="Imported Student Identities"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Activated Accounts"
              value={stats?.activatedStudents || students.filter((s) => s.activated).length}
              subtitle="Registered & Practicing"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="Activation Rate"
              value={`${stats?.activationRate || Math.round((students.filter((s) => s.activated).length / students.length) * 100)}%`}
              subtitle="Roster Onboarding Progress"
              icon={ShieldCheck}
              color="blue"
            />
            <MetricCard
              title="Total Questions"
              value={stats?.totalQuestionsInBank || 25}
              subtitle="Approved Item Bank"
              icon={BookOpen}
              color="purple"
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, enrollment # (24CS001), email, or department..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {(['ALL', 'ACTIVATED', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Records' : st === 'ACTIVATED' ? 'Activated' : 'Pending'}
                  </button>
                ))}
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                {['ALL', 'A', 'B'].map((div) => (
                  <button
                    key={div}
                    onClick={() => setDivisionFilter(div)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      divisionFilter === div
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {div === 'ALL' ? 'All Div' : `Div ${div}`}
                  </button>
                ))}
              </div>
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

            <div className="overflow-x-auto">
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
          </div>
        </main>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
