'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { UserRole } from '@clias/shared-types';
import {
  BookOpen,
  Users,
  FileCheck,
  TrendingUp,
  Sparkles,
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

export default function FacultyDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [cohortData, setCohortData] = useState<any>(null);
  const [assessmentCount, setAssessmentCount] = useState<number>(0);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== UserRole.FACULTY && user.role !== UserRole.SUPER_ADMIN))) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadInitialData();
    }
  }, [user, loading]);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const courseList: any = await api.get('/courses');
      if (courseList && courseList.length > 0) {
        setCourses(courseList);
        const facultyCourseId = user?.courseId || user?.assignedCourse?.id;
        const activeCourse = (facultyCourseId && courseList.find((c: any) => c.id === facultyCourseId)) || courseList[0];
        setSelectedCourse(activeCourse);
        await loadCourseDetails(activeCourse);
      }
    } catch (e) {
      console.error('Error loading courses:', e);
    } finally {
      setFetching(false);
    }
  };

  const loadCourseDetails = async (course: any) => {
    try {
      // 1. Load real course cohort analytics
      const res: any = await api.get(`/analytics/faculty/course/${course.id}/summary`);
      setCohortData(res);
    } catch (e) {
      setCohortData(null);
    }

    try {
      // 2. Load assessments created for this course
      const assessments: any = await api.get(`/assessments/student?courseId=${course.id}`);
      setAssessmentCount(assessments ? assessments.length : 0);
    } catch (e) {
      setAssessmentCount(0);
    }
  };

  const totalQuestions = selectedCourse?._count?.questions ?? 0;
  const enrolledCount = cohortData?.enrolledStudentsCount ?? 0;
  const classMastery = cohortData?.overallClassMastery ?? 0;
  const topicList = cohortData?.topicAnalytics ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Faculty Assessment & Curriculum Console"
          subtitle="Course orchestration, item bank management & class learning intelligence"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {courses.length > 1 ? (
                  <select
                    value={selectedCourse?.id || ''}
                    onChange={(e) => {
                      const c = courses.find((item: any) => item.id === e.target.value);
                      if (c) {
                        setSelectedCourse(c);
                        loadCourseDetails(c);
                      }
                    }}
                    className="text-xl font-bold text-slate-900 tracking-tight bg-transparent border-b border-dashed border-slate-300 pb-0.5 outline-none cursor-pointer hover:border-indigo-500 transition"
                  >
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedCourse ? `${selectedCourse.name} (${selectedCourse.code})` : 'Curriculum Console'}
                  </h2>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {user?.name || 'Faculty Member'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Teaching Subject
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {(selectedCourse as any)?.department?.name || (user as any)?.department?.name || 'Department of Computer Science & Engineering'} • {(selectedCourse as any)?.department?.institute?.name || (user as any)?.institute?.name || 'CHARUSAT'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/faculty/assessments"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4 text-slate-600" />
                <span>Create Assessment</span>
              </Link>
              <Link
                href="/faculty/ai-generator"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>AI Question Studio</span>
              </Link>
            </div>
          </div>

          {/* Metric Overview (Dynamically Sourced from Live Data) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Active Students"
              value={enrolledCount.toString()}
              subtitle="Enrolled Roster"
              icon={Users}
              color="indigo"
            />
            <MetricCard
              title="Curriculum Items"
              value={totalQuestions.toString()}
              subtitle="Topic Question Bank"
              icon={BookOpen}
              color="blue"
            />
            <MetricCard
              title="Class Avg Mastery"
              value={classMastery > 0 ? `${classMastery}%` : 'N/A'}
              subtitle="Dynamic BKT Mastery Index"
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              title="Active Assessments"
              value={assessmentCount.toString()}
              subtitle="Assigned Course Exams"
              icon={FileCheck}
              color="purple"
            />
          </div>

          {/* Curriculum Health Breakdown */}
          <div id="bank" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Curriculum Topic Health</h3>
                <p className="text-xs text-slate-500">Live knowledge distribution across class cohort</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/faculty/questions"
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Open Item Bank →
                </Link>
                <Link
                  href="/faculty/analytics"
                  className="text-xs font-bold text-slate-600 hover:underline"
                >
                  Detailed Class Analytics →
                </Link>
              </div>
            </div>

            {topicList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {topicList.slice(0, 6).map((topic: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800">{topic.topicName}</span>
                      <span
                        className={`font-bold ${
                          topic.classAverageMastery >= 75
                            ? 'text-emerald-600'
                            : topic.classAverageMastery >= 50
                            ? 'text-indigo-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {topic.classAverageMastery}% Mastery
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {topic.totalAttempts} practice submissions recorded
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-semibold text-slate-700">No Student Submissions Yet</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  When enrolled students complete practice drills or unit assessments, their mastery progression will reflect here.
                </p>
              </div>
            )}
          </div>

          {/* Platform Status */}
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-indigo-950">Faculty Console: Active & Synchronized</h4>
              <p className="text-indigo-800/80 leading-relaxed">
                Curriculum orchestration, AI question synthesis, automated rubric scoring, and proctoring surveillance are operational for <strong>{user?.name || 'Faculty Member'}</strong>.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
