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
  Building2,
  GraduationCap,
  Users,
  Award,
  Plus,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  School,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  hodName: string;
  hodEmail: string;
  studentCount: number;
  facultyCount: number;
  curriculumModules: number;
  accreditation: string;
}

interface InstituteItem {
  id: string;
  code: string;
  name: string;
  deanName: string;
  establishedYear: number;
  campusLocation: string;
  departments: DepartmentItem[];
}

export default function AdminInstitutesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedInstituteId, setSelectedInstituteId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepCode, setNewDepCode] = useState('');
  const [newDepName, setNewDepName] = useState('');
  const [newHodName, setNewHodName] = useState('');
  const [institutes, setInstitutes] = useState<InstituteItem[]>([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState<boolean>(true);

  const loadInstitutes = async () => {
    setLoadingInstitutes(true);
    try {
      const data: any = await api.get('/admin/institutes');
      if (Array.isArray(data) && data.length > 0) {
        setInstitutes(data);
        setSelectedInstituteId((prev) => (prev && data.some((i: any) => i.id === prev) ? prev : data[0].id));
      } else {
        setInstitutes([]);
      }
    } catch (err) {
      console.error('Failed to load institutes:', err);
      setInstitutes([]);
    } finally {
      setLoadingInstitutes(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== UserRole.SUPER_ADMIN)) {
      router.push('/auth/login');
      return;
    }

    if (user && user.role === UserRole.SUPER_ADMIN) {
      loadInstitutes();
    }
  }, [user, authLoading]);

  const currentInstitute = institutes.find((i) => i.id === selectedInstituteId) || institutes[0] || {
    id: '',
    code: '',
    name: 'No Institute Selected',
    deanName: '',
    establishedYear: 2000,
    campusLocation: '',
    departments: [],
  };

  const totalStudents = institutes.reduce(
    (acc, inst) => acc + (inst.departments?.reduce((dAcc, dep) => dAcc + (dep.studentCount || 0), 0) || 0),
    0
  );
  const totalFaculty = institutes.reduce(
    (acc, inst) => acc + (inst.departments?.reduce((dAcc, dep) => dAcc + (dep.facultyCount || 0), 0) || 0),
    0
  );
  const totalDepartments = institutes.reduce((acc, inst) => acc + (inst.departments?.length || 0), 0);

  const filteredDepartments = (currentInstitute.departments || []).filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.hodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepCode || !newDepName || !selectedInstituteId) return;

    try {
      await api.post('/admin/departments', {
        instituteId: selectedInstituteId,
        code: newDepCode,
        name: newDepName,
      });

      await loadInstitutes();
      setShowAddModal(false);
      setNewDepCode('');
      setNewDepName('');
      setNewHodName('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create department');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Hierarchy & Academic Governance"
          subtitle="Constituent Institutes, Academic Departments & Degree Program Provisioning"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  University Academic Architecture
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  CHARUSAT Governance Matrix
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage constituent institutes, departmental boundaries, program accreditations, and appointed leadership.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {/* Metric Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Constituent Institutes"
              value={institutes.length}
              subtitle="CSPIT, DEPSTAR, CMPICA"
              icon={School}
              color="indigo"
            />
            <MetricCard
              title="Academic Departments"
              value={totalDepartments}
              subtitle="Active Engineering & Tech Units"
              icon={Building2}
              color="blue"
            />
            <MetricCard
              title="Enrolled Student Body"
              value={totalStudents}
              subtitle="Across All Campuses"
              icon={Users}
              color="emerald"
            />
            <MetricCard
              title="Faculty Strength"
              value={totalFaculty}
              subtitle="Professors & Instructors"
              icon={GraduationCap}
              color="purple"
            />
          </div>

          {/* Institute Selection Tabs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Constituent Institute:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {institutes.map((inst) => {
                const isSelected = selectedInstituteId === inst.id;
                return (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedInstituteId(inst.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {inst.code}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        Est. {inst.establishedYear}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-semibold truncate ${isSelected ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      {inst.name}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
                        {inst.departments.length} Departments
                      </span>
                      <span className={isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}>
                        {inst.campusLocation}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department List for Selected Institute */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Academic Structure Details
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {currentInstitute.name} ({currentInstitute.code})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Head of Institute: {currentInstitute.deanName}
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Department Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Department Code &amp; Title</th>
                    <th className="p-4">Appointed HOD</th>
                    <th className="p-4">Students Enrolled</th>
                    <th className="p-4">Faculty</th>
                    <th className="p-4">Curriculum Items</th>
                    <th className="p-4">Accreditation Benchmark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {filteredDepartments.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{dep.code}</span>
                          <span className="text-slate-600 dark:text-slate-400 text-xs">({dep.name})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-white">{dep.hodName}</p>
                        <p className="font-mono text-[11px] text-slate-400">{dep.hodEmail}</p>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {dep.studentCount}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        {dep.facultyCount}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        {dep.curriculumModules}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {dep.accreditation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Add Department to {currentInstitute.code}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department Code (e.g. AI, CS-BS)
                </label>
                <input
                  type="text"
                  required
                  value={newDepCode}
                  onChange={(e) => setNewDepCode(e.target.value)}
                  placeholder="e.g. AIDS"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Department Title
                </label>
                <input
                  type="text"
                  required
                  value={newDepName}
                  onChange={(e) => setNewDepName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence &amp; Data Science"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Appointed HOD Name
                </label>
                <input
                  type="text"
                  value={newHodName}
                  onChange={(e) => setNewHodName(e.target.value)}
                  placeholder="e.g. Dr. H. P. Dave"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
