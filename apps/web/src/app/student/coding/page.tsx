'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Code,
  Terminal,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Layers,
  Award,
  BookOpen,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface CodingProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags?: string;
  createdAt: string;
  _count?: {
    testCases: number;
    submissions: number;
  };
}

interface SubmissionItem {
  id: string;
  language: string;
  status: string;
  executionTimeMs: number;
  memoryUsedKb: number;
  createdAt: string;
  problem: {
    title: string;
    slug: string;
    difficulty: string;
  };
}

export default function CodingProblemsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isPinned } = useSidebar();

  const [problems, setProblems] = useState<CodingProblemSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [problemsRes, submissionsRes] = await Promise.all([
        api.get('/coding/problems'),
        api.get('/coding/submissions'),
      ]);
      setProblems(problemsRes || []);
      setSubmissions(submissionsRes || []);
    } catch (err: any) {
      console.error('Failed to load coding arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (selectedDifficulty === 'ALL') return true;
    return p.difficulty === selectedDifficulty;
  });

  const acceptedCount = submissions.filter((s) => s.status === 'ACCEPTED').length;

  return (
    <div className="flex bg-[#F8FAFC] dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-500/20 p-8 shadow-xs dark:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Algorithmic Coding Engine & Judge
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Live Sandboxed Execution
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Coding Assessment Arena
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                  Solve real-world algorithmic problems with multi-language in-browser execution, automated test case
                  validation, and sub-millisecond asymptotic runtime profiling.
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{acceptedCount}</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Accepted</p>
                </div>
                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{problems.length}</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Problems</p>
                </div>
                <div className="text-center px-3">
                  <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">4</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Languages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty Filter Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Filter:
              </span>
              {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredProblems.length} of {problems.length} problem(s)
            </span>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Loading algorithmic problem library...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Problem List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredProblems.map((problem) => (
                  <div
                    key={problem.id}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/student/coding/${problem.slug}`}
                          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        >
                          {problem.title}
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            problem.difficulty === 'EASY'
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                              : problem.difficulty === 'MEDIUM'
                              ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>

                      {problem.tags && (
                        <div className="flex flex-wrap gap-1.5">
                          {problem.tags.split(',').map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                        <div>{problem._count?.testCases || 3} Testcases</div>
                        <div className="text-[11px] text-slate-400">
                          {problem._count?.submissions || 1} Submissions
                        </div>
                      </div>

                      <Link
                        href={`/student/coding/${problem.slug}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        Code & Run
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar: Recent Submissions & Environment Specs */}
              <div className="space-y-6">
                {/* Recent Submissions */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Your Recent Submissions
                  </h3>

                  {submissions.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                      No submissions recorded yet. Select a problem to start coding!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{sub.problem?.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {sub.language} • {sub.executionTimeMs}ms
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              sub.status === 'ACCEPTED'
                                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Judge Environment Architecture Card */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Judge Execution Environment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Code is evaluated in isolated sandbox workers with strict memory and time boundaries.
                  </p>
                  <div className="text-[11px] space-y-1.5 text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Python:</span>
                      <span className="font-mono text-blue-300">v3.11 CPython</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">C++:</span>
                      <span className="font-mono text-blue-300">GCC 13.2 -O2 (C++20)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Java:</span>
                      <span className="font-mono text-blue-300">OpenJDK 21 LTS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">JavaScript:</span>
                      <span className="font-mono text-blue-300">Node.js 20.x V8</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Default Time Limit:</span>
                      <span className="font-semibold text-emerald-400">2000 ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
