'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { CounsellorAssignmentModal } from '@/components/CounsellorAssignmentModal';
import { FacultyCourseAssignmentModal } from '@/components/FacultyCourseAssignmentModal';
import { UserRole } from '@clias/shared-types';
import {
  Users,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

export default function HodDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [curriculumHealth, setCurriculumHealth] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [isCounsellorModalOpen, setIsCounsellorModalOpen] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.HOD && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadCurriculumData();
    }
  }, [user, loading]);

  const loadCurriculumData = async () => {
    setFetching(true);
    try {
      const [coursesRes, healthRes]: any = await Promise.all([
        api.get('/courses').catch(() => []),
        api.get('/analytics/hod/curriculum-health/me').catch(() => null),
      ]);

      let courseList = Array.isArray(coursesRes) && coursesRes.length > 0 ? coursesRes : [];
      if (courseList.length === 0 && healthRes?.coursesHealth?.length > 0) {
        courseList = healthRes.coursesHealth;
      }
      setCourses(courseList);
      setCurriculumHealth(healthRes);
    } catch (e) {
      console.error('Failed to load HOD curriculum data:', e);
    } finally {
      setFetching(false);
    }
  };

  // Standardize division benchmarks strictly into two canonical cohorts: Div 1 and Div 2
  const normalizedDivisionBenchmarks = useMemo(() => {
    if (!curriculumHealth?.divisionBenchmark || !Array.isArray(curriculumHealth.divisionBenchmark)) {
      return [];
    }

    let div1 = { division: 'Div 1', label: 'Division 1 (Div 1)', enrolledStudents: 0, totalMasteryWeight: 0, riskCount: 0 };
    let div2 = { division: 'Div 2', label: 'Division 2 (Div 2)', enrolledStudents: 0, totalMasteryWeight: 0, riskCount: 0 };

    for (const b of curriculumHealth.divisionBenchmark) {
      const divStr = String(b.division || '').toUpperCase();
      const isDiv2 = divStr.includes('2') || divStr.includes('B');
      const target = isDiv2 ? div2 : div1;
      const count = Number(b.enrolledStudents || 0);

      target.enrolledStudents += count;
      target.totalMasteryWeight += Number(b.averageMastery || 0) * count;
      target.riskCount += Number(b.riskCount || 0);
    }

    return [
      {
        division: div1.division,
        label: div1.label,
        enrolledStudents: div1.enrolledStudents,
        averageMastery: div1.enrolledStudents > 0 ? Math.round(div1.totalMasteryWeight / div1.enrolledStudents) : 0,
        riskCount: div1.riskCount,
      },
      {
        division: div2.division,
        label: div2.label,
        enrolledStudents: div2.enrolledStudents,
        averageMastery: div2.enrolledStudents > 0 ? Math.round(div2.totalMasteryWeight / div2.enrolledStudents) : 0,
        riskCount: div2.riskCount,
      },
    ];
  }, [curriculumHealth?.divisionBenchmark]);

  const departmentTitle = curriculumHealth?.departmentName || 'Computer Science & Engineering';

  return (
    <div className="min-h-screen bg-transparent flex text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Department Learning Intelligence & Academic Health"
          subtitle={`${departmentTitle} • Department Leadership Console`}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                HOD DASHBOARD
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-[8px] uppercase tracking-wider text-[#6b7fa3]">CURRICULUM MASTERY</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {curriculumHealth?.averageMastery ? `${Math.round(curriculumHealth.averageMastery)}` : '0'}<span className="font-mono text-sm text-[#e05033]">%</span>
              </strong>
              <p className="mono text-[8px] text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">ACADEMIC HEALTH</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">CURRICULUM</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{courses.length} COURSES</div>
              <div className="metric-label mono">DEPARTMENT SUBJECTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">HEALTH</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{curriculumHealth?.averageMastery ? `${Math.round(curriculumHealth.averageMastery)}%` : '0%'}</div>
              <div className="metric-label mono">CURRICULUM MASTERY</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>DIVISIONS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">2 COHORTS</div>
              <div className="metric-label mono">BENCHMARK ACTIVE</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">STATUS</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">OPERATIONAL</div>
              <div className="metric-label mono">ACADEMIC COUNCIL</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <h2 className="font-display text-xl uppercase tracking-wide">{departmentTitle.toUpperCase()}</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Curriculum mastery metrics, division-to-division comparative benchmarks, and faculty workload delegation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setIsFacultyModalOpen(true)}
                className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
                style={{ borderRadius: 0 }}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                <span>ASSIGN FACULTY</span>
              </button>
              <button
                onClick={() => setIsCounsellorModalOpen(true)}
                className="action-button bg-[#1a2540] hover:bg-[#25365d] text-white border border-[rgba(106,144,197,0.4)] shrink-0"
                style={{ borderRadius: 0 }}
              >
                <Users className="w-4 h-4 mr-2" />
                <span>ASSIGN COUNSELLORS</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Department Students"
              value={curriculumHealth?.divisionBenchmark ? curriculumHealth.divisionBenchmark.reduce((acc: number, d: any) => acc + (d.enrolledStudents || 0), 0).toString() : '0'}
              subtitle={`${departmentTitle} Enrolled Roster`}
              icon={Users}
              color="purple"
            />
            <MetricCard
              title="Core Courses"
              value={(curriculumHealth?.coursesHealth?.length ?? courses.length).toString()}
              subtitle={curriculumHealth?.coursesHealth?.map((c: any) => c.code).join(', ') || courses.map((c: any) => c.code).join(', ') || 'Department Course Catalog'}
              icon={BookOpen}
              color="indigo"
            />
            <MetricCard
              title="Curriculum Mastery"
              value={curriculumHealth?.averageMastery ? `${Math.round(curriculumHealth.averageMastery)}%` : '0%'}
              subtitle="Department Average Score"
              icon={TrendingUp}
              trend={{
                value: (curriculumHealth?.averageMastery ?? 0) >= 60 ? 'Healthy Performance' : 'Requires Review',
                isPositive: (curriculumHealth?.averageMastery ?? 0) >= 60,
              }}
              color="emerald"
            />
            <MetricCard
              title="At-Risk Cohort"
              value={curriculumHealth?.divisionBenchmark ? curriculumHealth.divisionBenchmark.reduce((acc: number, d: any) => acc + (d.riskCount || 0), 0).toString() : '0'}
              subtitle={curriculumHealth?.divisionBenchmark && curriculumHealth.divisionBenchmark.length > 0 ? `Across ${curriculumHealth.divisionBenchmark.map((d: any) => d.division).join(', ')}` : 'Active Division Roster'}
              icon={AlertTriangle}
              color="rose"
            />
          </div>

          {/* Division Benchmarking */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600 dark:text-cyan-400" />
                Division-to-Division Comparative Benchmark
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {normalizedDivisionBenchmarks.map((div: any) => (
                <div
                  key={div.division}
                  className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 dark:hover:border-cyan-500/40 transition space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 dark:bg-cyan-500/10 border border-teal-500/20 dark:border-cyan-500/20 flex items-center justify-center font-mono font-bold text-teal-700 dark:text-cyan-400 text-xs">
                        {div.division === 'Div 1' ? '01' : '02'}
                      </div>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {div.label}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700">
                      {div.enrolledStudents} Students
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Average Mastery</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{div.averageMastery}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${div.averageMastery}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">At-Risk Students:</span>
                    <span className={`font-bold font-mono ${div.riskCount > 2 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {div.riskCount} Students Flagged
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Counsellor Allocation Modal */}
      <CounsellorAssignmentModal
        isOpen={isCounsellorModalOpen}
        onClose={() => setIsCounsellorModalOpen(false)}
        onSuccess={() => loadCurriculumData()}
      />

      {/* Faculty Course Multi-Assignment Modal */}
      <FacultyCourseAssignmentModal
        isOpen={isFacultyModalOpen}
        onClose={() => setIsFacultyModalOpen(false)}
        onSuccess={() => loadCurriculumData()}
      />
    </div>
  );
}
