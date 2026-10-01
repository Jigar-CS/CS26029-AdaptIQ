'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  FileText,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface AssessmentItem {
  id: string;
  title: string;
  description?: string;
  code: string;
  courseCode: string;
  courseName: string;
  type: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  totalQuestions: number;
  allowedAttempts: number;
  attemptsCount: number;
  hasAvailableAttempts: boolean;
  activeSubmissionId: string | null;
  bestScore: number | null;
  bestPercentage: number | null;
  passed: boolean;
}

export default function StudentAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('ALL');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadAssessments();
    }
  }, [user, authLoading]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/assessments/student');
      setAssessments(data);
    } catch (err) {
      console.error('Failed to load assessments', err);
    } finally {
      setLoading(false);
    }
  };

  const courses = Array.from(new Set(assessments.map((a) => a.courseCode)));
  const filtered = filterCourse === 'ALL' ? assessments : assessments.filter((a) => a.courseCode === filterCourse);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Formal Assessments & Exams"
          subtitle="Departmental quizzes, mid-terms, and timed evaluations"
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header filter bar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Scheduled Assessments
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Official proctored and timed examinations assigned by your course instructors.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Filter Course:</span>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="p-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessment Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400">
              Loading assessments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500 dark:text-slate-400">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Assessments Assigned</p>
              <p className="text-xs text-slate-400 mt-1">You currently have no pending tests for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((item) => {
                const canAttempt = item.hasAvailableAttempts || !!item.activeSubmissionId;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            {item.courseCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.type}
                          </span>
                        </div>

                        {item.bestScore !== null && (
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            {item.passed ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {item.bestPercentage?.toFixed(0)}% Passed
                              </span>
                            ) : (
                              <span className="text-rose-600 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                {item.bestPercentage?.toFixed(0)}% Retake
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Duration</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            {item.durationMinutes}m
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Questions</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                            {item.totalQuestions} MCQs
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Attempts</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                            {item.attemptsCount} / {item.allowedAttempts}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Passing criteria: <strong className="text-slate-700 dark:text-slate-200">{item.passingMarks}%</strong>
                      </span>

                      {canAttempt ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/student/assessments/${item.id}/take`)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{item.activeSubmissionId ? 'Resume Exam' : 'Start Exam'}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Attempts Exhausted
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
