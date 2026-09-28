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
  Loader2,
  Plus,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const [statsRes, studentsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/students?limit=50'),
      ]);
      setStats(statsRes);
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.enrollmentNumber?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Student Registry"
          subtitle="Authorized student identities, roster ingestion & access control"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Authorized Student Roster
              </h2>
              <p className="text-xs text-slate-500">
                Official institution database proxy for secure student registration & verification
              </p>
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Students CSV</span>
            </button>
          </div>

          {/* Metric Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Authorized Roster"
              value={stats?.totalAuthorizedStudents || 0}
              subtitle="Imported Student Identities"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Activated Accounts"
              value={stats?.activatedStudents || 0}
              subtitle="Registered & Practicing"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="Activation Rate"
              value={`${stats?.activationRate || 0}%`}
              subtitle="Roster Onboarding Progress"
              icon={ShieldCheck}
              color="blue"
            />
            <MetricCard
              title="Total Questions"
              value={stats?.totalQuestionsInBank || 0}
              subtitle="Approved Item Bank"
              icon={BookOpen}
              color="purple"
            />
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            {/* Search and Table Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, enrollment #, email, or department..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Showing <strong>{filteredStudents.length}</strong> of {students.length} students
              </span>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Enrollment #</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">University Email</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Sem / Div</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{s.enrollmentNumber}</td>
                        <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{s.email}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {s.department}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{s.programName}</td>
                        <td className="p-3">
                          Sem {s.semester}, Div {s.division}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.activated
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
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
                        {loading ? 'Loading student roster...' : 'No matching student records found.'}
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
