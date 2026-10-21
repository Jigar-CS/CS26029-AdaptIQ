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
  Building,
  GraduationCap,
  TrendingUp,
  Award,
  CheckCircle2,
} from 'lucide-react';

export default function HeadDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState('CSE');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.HEAD && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, loading]);

  const loadData = async () => {
    setFetching(true);
    try {
      const [sumRes, coursesRes]: any = await Promise.all([
        api.get('/analytics/institutional/summary').catch(() => null),
        api.get('/courses').catch(() => []),
      ]);
      setSummaryData(sumRes);
      setCoursesList(coursesRes || []);
    } catch (e) {
      console.error('Failed to load institutional telemetry:', e);
    } finally {
      setFetching(false);
    }
  };

  const universityName = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'CHARUSAT';
  const activePrograms = summaryData?.programs && summaryData.programs.length > 0 ? summaryData.programs : [];

  const currentProgram = activePrograms.find((p: any) => p.code === selectedBranch) || activePrograms[0] || {
    code: '',
    name: 'Academic Discipline',
    enrolledStudents: 0,
    coursesCount: 0,
    avgMastery: 0,
    status: 'ACTIVE',
  };

  return (
    <div className="min-h-screen bg-transparent flex text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title={`${universityName} Institutional Intelligence Executive Console`}
          subtitle="Cross-departmental learning curves, accreditation indicators & faculty performance"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <p className="mono text-[#4a6fa5] dark:text-[#6a90c5] tracking-widest text-[9px] uppercase mb-2">
                ACADEMIC INTELLIGENCE / INSTITUTIONAL OVERVIEW / 01
              </p>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                INSTITUTIONAL OVERVIEW
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-[8px] uppercase tracking-wider text-[#6b7fa3]">INSTITUTIONAL INDEX</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {summaryData?.institutionalMastery ?? 0}<span className="font-mono text-sm text-[#e05033]">%</span>
              </strong>
              <p className="mono text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">CHARUSAT CAMPUS BENCHMARK</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">STUDENTS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{summaryData?.totalStudentsEnrolled ?? 0}</div>
              <div className="metric-label mono">TOTAL ENROLLED</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">DEPARTMENTS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{summaryData?.departmentCount ?? 0}</div>
              <div className="metric-label mono">ACTIVE DEPARTMENTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>MASTERY</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{summaryData?.institutionalMastery ?? 0}%</div>
              <div className="metric-label mono">KNOWLEDGE INDEX</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">COURSES</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{coursesList.length}</div>
              <div className="metric-label mono">ACTIVE COURSES</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <p className="mono text-[#e05033] text-[9px]">INSTITUTIONAL TELEMETRY & BRANCH COMPARISON</p>
              <h2 className="font-display text-xl uppercase tracking-wide">CROSS-DISCIPLINARY ACADEMIC HEALTH</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Real-time accreditation indicators, engineering branch benchmark comparison, and curriculum velocity across departments.
              </p>
            </div>
            <span className="px-3 py-1.5 bg-[#1a2540] text-[#e8edf5] border border-[rgba(106,144,197,0.3)] text-xs font-mono uppercase tracking-wider shrink-0" style={{ borderRadius: 0 }}>
              INSTITUTIONAL HEAD VIEW
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Enrolled"
              value={(summaryData?.totalStudentsEnrolled ?? 0).toString()}
              subtitle="Enrolled Active Roster"
              icon={GraduationCap}
              color="blue"
            />
            <MetricCard
              title="Active Departments"
              value={(summaryData?.departmentCount ?? 0).toString()}
              subtitle={`${summaryData?.departmentCount ?? 0} Departments Active`}
              icon={Building}
              color="indigo"
            />
            <MetricCard
              title="Institutional Mastery"
              value={`${summaryData?.institutionalMastery ?? 0}%`}
              subtitle="Institution-Wide Knowledge Index"
              icon={TrendingUp}
              trend={{
                value: (summaryData?.institutionalMastery ?? 0) >= 50 ? 'Baseline Competency Met' : 'Calibrating Diagnostic Baseline',
                isPositive: (summaryData?.institutionalMastery ?? 0) >= 50,
              }}
              color="emerald"
            />
            <MetricCard
              title="Curriculum Items"
              value={(coursesList.length || 5).toString()}
              subtitle="Active Courses in Catalog"
              icon={Award}
              color="purple"
            />
          </div>

          {/* Department Comparison & Interactive Branch Switcher */}
          <div id="programs" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Engineering Programs Matrix</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live telemetry across active accredited engineering disciplines</p>
              </div>
              <a
                href="/head/programs"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Full Program Comparison</span>
                <span className="text-sm">→</span>
              </a>
            </div>

            {/* Branch Switcher Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {activePrograms.map((b: any) => {
                const isSelected = selectedBranch === b.code;
                return (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBranch(b.code)}
                    className={`p-4 rounded-xl border text-left transition-all ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                        {b.code}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                        {b.avgMastery}%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block mt-1 truncate">{b.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-0.5">
                      {b.enrolledStudents} Enrolled • {b.coursesCount} Courses
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detailed Selected Branch Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">Selected Discipline Detail</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {currentProgram?.name || 'Computer Science & Engineering'} ({currentProgram?.code || 'CSE'})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Curriculum aligned with IEEE / ACM / NBA criteria • Active Semester Knowledge Base
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Enrolled Cohort</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {currentProgram?.enrolledStudents ?? 119} Students
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Core Courses</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {currentProgram?.coursesCount ?? 5}
                  </span>
                </div>
                <a
                  href="/head/programs"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  View Matrix →
                </a>
              </div>
            </div>
          </div>


        </main>
      </div>
    </div>
  );
}
