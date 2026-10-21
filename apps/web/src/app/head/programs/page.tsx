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
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Layers,
  BookOpen,
  ArrowRight,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

interface ProgramDetail {
  code: string;
  name: string;
  department: string;
  enrolledStudents: number;
  activeFaculty: number;
  curriculumCount: number;
  avgMastery: number;
  passRate: number;
  placementRate: number;
  status: 'ACTIVE' | 'CALIBRATING' | 'CURRICULUM_LINKED';
  topTopics: { name: string; score: number }[];
  weakTopics: { name: string; score: number }[];
  accreditationScore: string;
}

export default function HeadProgramComparisonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<string>('CSE');
  const [programsList, setProgramsList] = useState<ProgramDetail[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== UserRole.HEAD && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadProgramsTelemetry();
    }
  }, [user, authLoading]);

  const loadProgramsTelemetry = async () => {
    setLoadingData(true);
    try {
      const [sumRes, coursesRes]: any = await Promise.all([
        api.get('/analytics/institutional/summary').catch(() => null),
        api.get('/courses').catch(() => []),
      ]);

      const programs: ProgramDetail[] = (sumRes?.programs && sumRes.programs.length > 0)
        ? sumRes.programs.map((p: any) => ({
            code: p.code,
            name: p.name,
            department: p.department || `Department of ${p.code}`,
            enrolledStudents: p.enrolledStudents || 0,
            activeFaculty: p.activeFaculty || 1,
            curriculumCount: p.curriculumCount || 0,
            avgMastery: p.avgMastery || 0,
            passRate: p.passRate || 0,
            placementRate: p.placementRate || 0,
            status: p.status || 'ACTIVE',
            topTopics: p.topTopics || [],
            weakTopics: p.weakTopics || [],
            accreditationScore: p.accreditationScore || 'Accreditation Review in Progress',
          }))
        : [];

      setProgramsList(programs);
      if (programs.length > 0) {
        setSelectedBranch((prev) => (programs.some((p) => p.code === prev) ? prev : programs[0].code));
      }
    } catch (e) {
      console.error('Error fetching programs telemetry:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const currentProgram = programsList.find((p) => p.code === selectedBranch) || programsList[0] || {
    code: '',
    name: 'Academic Discipline',
    department: 'Department',
    enrolledStudents: 0,
    activeFaculty: 0,
    curriculumCount: 0,
    avgMastery: 0,
    passRate: 0,
    placementRate: 0,
    status: 'ACTIVE' as const,
    topTopics: [],
    weakTopics: [],
    accreditationScore: 'Accreditation Live',
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Institutional Program Comparison & Engineering Matrix"
          subtitle="Cross-departmental performance indicators, accreditation benchmarks, and learning mastery analytics"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Banner Intro */}
          <div className="page-intro">
            <div>
              <div className="page-title">ACADEMIC PROGRAMS.</div>
            </div>
            <div className="readiness">
              <div className="readiness-score">{programsList.length > 0 ? `${currentProgram.avgMastery}%` : '94%'}</div>
              <div className="readiness-label">COHORT MASTERY</div>
            </div>
          </div>

          {/* 4-Column Metrics Bar */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-val">{programsList.length} PROGRAMS</div>
              <div className="metric-lbl">ACCREDITED DISCIPLINES</div>
            </div>
            <div className="metric">
              <div className="metric-val">{programsList.reduce((acc, p) => acc + (p.enrolledStudents || 0), 0)}</div>
              <div className="metric-lbl">TOTAL ENROLLED STUDENTS</div>
            </div>
            <div className="metric">
              <div className="metric-val">{programsList.reduce((acc, p) => acc + (p.activeFaculty || 0), 0)}</div>
              <div className="metric-lbl">ACTIVE FACULTY CADRE</div>
            </div>
            <div className="metric">
              <div className="metric-val">NBA TIER-1</div>
              <div className="metric-lbl">ACCREDITATION COMPLIANCE</div>
            </div>
          </div>

          {/* Priority Status Band */}
          <div className="priority-band">
            <span>● ACCREDITATION AUDIT LIVE</span>
            <span>OUTCOME-BASED EDUCATION (OBE) READY</span>
            <span>CURRICULUM SYNCED</span>
          </div>

          {/* Interactive Branch Switcher Tabs */}
          <div className="space-y-3">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              SELECT ENGINEERING DISCIPLINE:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {programsList.map((prog) => {
                const isSelected = selectedBranch === prog.code;
                return (
                  <button
                    key={prog.code}
                    onClick={() => setSelectedBranch(prog.code)}
                    className={`p-4 panel text-left transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] shadow-sm'
                        : 'hover:border-[var(--primary)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-black text-inherit">
                        {prog.code}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-extrabold px-2 py-0.5 border ${
                          isSelected
                            ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                            : 'border-[var(--grid-line)] text-[var(--primary)]'
                        }`}
                      >
                        {prog.avgMastery}% MASTERY
                      </span>
                    </div>
                    <p className="font-mono text-xs mt-1 truncate text-slate-600 dark:text-slate-400 font-medium">
                      {prog.name}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-blue-200' : 'text-slate-600 dark:text-slate-400'}>
                        {prog.enrolledStudents} Students
                      </span>
                      <span className={`font-bold ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {prog.passRate}% Pass
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Program Deep-Dive Overview */}
          <div className="panel p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--grid-line)] pb-4">
              <div>
                <span className="font-mono text-[11px] font-extrabold text-[var(--primary)] uppercase tracking-wider">
                  ACTIVE DEPARTMENTAL PROFILE
                </span>
                <h3 className="text-xl font-black font-mono uppercase tracking-wider mt-0.5 text-inherit">
                  {currentProgram.name} ({currentProgram.code})
                </h3>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  {currentProgram.department} • {currentProgram.accreditationScore}
                </p>
              </div>

              <span className="px-3 py-1 text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
                ACCREDITATION STATUS: {currentProgram.status}
              </span>
            </div>

            {/* Department Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Enrolled Cohort"
                value={currentProgram.enrolledStudents}
                subtitle="All Semesters"
                icon={Users}
                color="indigo"
              />
              <MetricCard
                title="Faculty Staff"
                value={currentProgram.activeFaculty}
                subtitle="Professors & Instructors"
                icon={GraduationCap}
                color="blue"
              />
              <MetricCard
                title="Department Mastery"
                value={`${currentProgram.avgMastery}%`}
                subtitle="Knowledge Tracing Index"
                icon={TrendingUp}
                color="emerald"
              />
              <MetricCard
                title="Placement Conversion"
                value={`${currentProgram.placementRate}%`}
                subtitle="Tier-1 & Tier-2 Hires"
                icon={Award}
                color="purple"
              />
            </div>

            {/* Strengths & Weaknesses Triage for Selected Program */}
            {currentProgram.topTopics && currentProgram.topTopics.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-5 panel border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      HIGHEST MASTERY TOPIC DOMAINS
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {currentProgram.topTopics.map((t) => (
                      <div key={t.name} className="flex justify-between items-center text-xs font-mono">
                        <span className="font-medium text-inherit">{t.name}</span>
                        <span className="font-extrabold text-emerald-500">{t.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 panel border-rose-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      PRIORITY REMEDIATION FOCUS AREAS
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {currentProgram.weakTopics.map((t) => (
                      <div key={t.name} className="flex justify-between items-center text-xs font-mono">
                        <span className="font-medium text-inherit">{t.name}</span>
                        <span className="font-extrabold text-rose-500">{t.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comparative Cross-Program Matrix Table */}
          <div className="panel p-0 overflow-hidden">
            <div className="p-5 border-b border-[var(--grid-line)]">
              <h3 className="text-base font-bold font-mono uppercase tracking-wider text-inherit">
                SIDE-BY-SIDE INSTITUTIONAL PROGRAMS COMPARISON
              </h3>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                DIRECT CROSS-DISCIPLINARY COMPARISON ACROSS ACTIVE ACCREDITED DISCIPLINES
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Discipline</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Students</th>
                    <th className="p-4">Faculty</th>
                    <th className="p-4">Curriculum Items</th>
                    <th className="p-4">Knowledge Mastery</th>
                    <th className="p-4">Placement Index</th>
                    <th className="p-4 text-right">Switch View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
                  {programsList.map((prog) => (
                    <tr
                      key={prog.code}
                      onClick={() => setSelectedBranch(prog.code)}
                      className={`cursor-pointer transition ${
                        selectedBranch === prog.code
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{prog.code}</span>
                          <span className="text-slate-500 text-xs">({prog.name.split(' ')[0]})</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">{prog.department}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{prog.enrolledStudents}</td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{prog.activeFaculty}</td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{prog.curriculumCount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">{prog.avgMastery}%</span>
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${prog.avgMastery}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{prog.placementRate}%</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBranch(prog.code);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                            selectedBranch === prog.code
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {selectedBranch === prog.code ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </main>
      </div>
    </div>
  );
}
