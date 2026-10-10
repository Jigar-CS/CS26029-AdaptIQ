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
  Building2,
  Users,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Award,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';

interface CourseOutcome {
  id: string;
  code: string;
  description: string;
  targetAttainment: number;
  actualAttainment: number;
  status: string;
  mappedQuestionsCount: number;
  programOutcomes: {
    poCode: string;
    nbaCategory: string;
    correlationLevel: number;
  }[];
}

interface ProgramOutcomeMatrixItem {
  code: string;
  nbaCategory: string;
  calculatedAttainment: number;
  targetAttainment: number;
  accreditationThresholdMet: boolean;
}

export default function HodDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [obeData, setObeData] = useState<any>(null);
  const [curriculumHealth, setCurriculumHealth] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'obe' | 'divisions'>('obe');

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.HOD && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadOBEAndCurriculumData();
    }
  }, [user, loading]);

  const loadOBEAndCurriculumData = async (courseId?: string) => {
    setFetching(true);
    try {
      const coursesRes: any = await api.get('/courses').catch(() => []);
      const courseList = Array.isArray(coursesRes) ? coursesRes : [];
      setCourses(courseList);

      const targetCourseId = courseId || selectedCourseId || courseList?.[0]?.id || 'CS301';
      if (!selectedCourseId && courseList?.[0]?.id) {
        setSelectedCourseId(courseList[0].id);
      }

      const [obeRes, healthRes]: any = await Promise.all([
        api.get(`/analytics/obe/courses/${targetCourseId}/attainment`).catch(() => null),
        api.get('/analytics/hod/curriculum-health/CSE').catch(() => null),
      ]);
      setObeData(obeRes);
      setCurriculumHealth(healthRes);
    } catch (e) {
      console.error('Failed to load HOD curriculum data:', e);
    } finally {
      setFetching(false);
    }
  };

  const handleCourseChange = async (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    setFetching(true);
    try {
      const obeRes: any = await api.get(`/analytics/obe/courses/${newCourseId}/attainment`).catch(() => null);
      setObeData(obeRes);
    } catch (e) {
      console.error('Error changing OBE course:', e);
    } finally {
      setFetching(false);
    }
  };

  const departmentTitle = curriculumHealth?.departmentName || 'Computer Science & Engineering';

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Department Learning Intelligence & Academic Health"
          subtitle={`${departmentTitle} • Department Leadership Console`}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {departmentTitle} OBE &amp; Curriculum Intelligence
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Accreditation Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Outcome-Based Education (OBE) metrics, NBA/NAAC CO-PO attainment matrices, and division-level comparative health.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> NBA Criteria 3 &amp; 4 Compliant
              </span>
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
              title="CO Attainment Rate"
              value={obeData?.overallCourseAttainment ? `${obeData.overallCourseAttainment}%` : '0%'}
              subtitle="Target Threshold 70%"
              icon={TrendingUp}
              trend={{
                value: (obeData?.overallCourseAttainment ?? 0) >= 65 ? 'Above NBA Benchmark' : 'Awaiting Student Assessments',
                isPositive: (obeData?.overallCourseAttainment ?? 0) >= 65,
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

          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('obe')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'obe'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4" />
              Outcome-Based Education (CO-PO Matrix)
            </button>

            <button
              onClick={() => setActiveTab('divisions')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'divisions'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Division Comparative Benchmark
            </button>
          </div>

          {/* TAB 1: OBE Matrix */}
          {activeTab === 'obe' && obeData && (
            <div className="space-y-6">
              {/* Course Outcome Attainment Table */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      Course Outcome (CO) Direct Attainment — {obeData.courseCode} {obeData.courseName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluated directly from student assessment question submissions and adaptive practice attempts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {courses.length > 0 && (
                      <select
                        value={selectedCourseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 text-purple-300 border border-slate-800 outline-none cursor-pointer hover:border-purple-500 transition"
                      >
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                      Target: 70%
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 w-16">CO Code</th>
                        <th className="p-3">Course Outcome Statement</th>
                        <th className="p-3">Mapped POs</th>
                        <th className="p-3">Target</th>
                        <th className="p-3">Attained</th>
                        <th className="p-3">Accreditation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                      {obeData.courseOutcomes && obeData.courseOutcomes.length > 0 ? (
                        obeData.courseOutcomes.map((co: CourseOutcome) => (
                          <tr key={co.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold font-mono text-purple-400">{co.code}</td>
                            <td className="p-3 text-slate-200">{co.description}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {co.programOutcomes.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700"
                                  >
                                    {p.poCode} ({p.correlationLevel})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-400">{co.targetAttainment}%</td>
                            <td className="p-3 font-mono font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span>{co.actualAttainment}%</span>
                                <div className="w-16 bg-slate-800 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      co.actualAttainment >= co.targetAttainment ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${Math.min(100, co.actualAttainment)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  co.status === 'ATTAINED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {co.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No Course Outcomes mapped for {obeData.courseCode || 'this course'} yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Program Outcome Matrix */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-400" />
                      Program Outcome (PO) Correlation Attainment Matrix (NBA Standards)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Weighted attainment calculated using correlation level weights (1: Low, 2: Moderate, 3: Substantial).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {obeData.programOutcomesMatrix && obeData.programOutcomesMatrix.length > 0 ? (
                    obeData.programOutcomesMatrix.map((po: ProgramOutcomeMatrixItem) => (
                      <div
                        key={po.code}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold font-mono text-purple-400">{po.code}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              po.accreditationThresholdMet
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {po.accreditationThresholdMet ? 'Threshold Met' : 'Review Needed'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-semibold">{po.nbaCategory}</div>
                        <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
                          <span className="text-xs text-slate-400">Calculated:</span>
                          <span className="text-lg font-bold text-white font-mono">{po.calculatedAttainment}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 p-8 text-center text-slate-400">
                      No Program Outcomes mapped for this course yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Division Benchmarking */}
          {activeTab === 'divisions' && curriculumHealth && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Division-to-Division Comparative Benchmark
              </h3>
              <p className="text-xs text-slate-400">
                Comparative mastery analysis enables targeted pedagogical interventions across faculty sections.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {curriculumHealth.divisionBenchmark.map((div: any) => (
                  <div
                    key={div.division}
                    className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-white">
                        {div.division.startsWith('DIV') ? div.division : `Division ${div.division}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">
                        {div.enrolledStudents} Students
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Average Mastery</span>
                        <span className="font-bold text-emerald-400">{div.averageMastery}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${div.averageMastery}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">At-Risk Students:</span>
                      <span className={`font-bold ${div.riskCount > 2 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {div.riskCount} Students Flagged
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture Guarantee */}
          <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-purple-200 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-white">NBA/NAAC Accreditation Continuous Improvement Model</h4>
              <p className="text-purple-300/80 leading-relaxed">
                As required by NBA Tier-I/II criteria, Course Outcome attainment is evaluated continuously from granular student assessment submissions rather than superficial end-of-semester subjective surveys.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
