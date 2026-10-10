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
  Wand2,
  X,
  AlertCircle,
  Database,
  Check,
  Eye,
  FileCode,
  Copy,
  RotateCcw,
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
  sourceCode: string;
  status: string;
  score?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  executionTimeMs: number;
  memoryUsedKb: number;
  createdAt: string;
  problem: {
    id?: string;
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

  // Tab & inspection state
  const [activeTab, setActiveTab] = useState<'challenges' | 'submissions'>('challenges');
  const [inspectedSubmission, setInspectedSubmission] = useState<SubmissionItem | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'ACCEPTED' | 'FAILED'>('ALL');
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  // Gemini AI generation state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('Array & Hash Table');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSeedCurated = async () => {
    setIsSeeding(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post('/coding/problems/seed-curated');
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Standard DSA library initialized successfully!',
      });
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to seed curated problems bank.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleGenerateAiProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setFeedbackMessage(null);

    try {
      const newProblem = await api.post('/coding/problems/generate-ai', {
        topic: aiTopic,
        difficulty: aiDifficulty,
        customPrompt: aiPrompt || undefined,
      });

      setShowAiModal(false);
      setFeedbackMessage({
        type: 'success',
        text: `Created new AI challenge: "${newProblem.title}" (${newProblem.difficulty}).`,
      });

      await loadData();
      router.push(`/student/coding/${newProblem.slug}`);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'AI problem synthesis failed. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Set of solved problem IDs or slugs for green tick & 'Try Again' state
  const solvedProblemSet = new Set<string>();
  submissions.forEach((sub) => {
    if (sub.status === 'ACCEPTED') {
      if (sub.problem?.id) solvedProblemSet.add(sub.problem.id);
      if (sub.problem?.slug) solvedProblemSet.add(sub.problem.slug);
      if ((sub as any).problemId) solvedProblemSet.add((sub as any).problemId);
    }
  });

  const filteredProblems = problems.filter((p) => {
    if (selectedDifficulty === 'ALL') return true;
    return p.difficulty === selectedDifficulty;
  });

  const filteredSubmissions = submissions.filter((sub) => {
    if (submissionFilter === 'ALL') return true;
    if (submissionFilter === 'ACCEPTED') return sub.status === 'ACCEPTED';
    if (submissionFilter === 'FAILED') return sub.status !== 'ACCEPTED';
    return true;
  });

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'lg:pl-64' : 'lg:pl-[72px]'} pl-0`}>
        <Navbar />

        <main className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Real Sandboxed Code Execution</span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <Terminal className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  Coding Arena
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Solve curated algorithmic problems with real-time automated test-case evaluation, hidden edge-case assertions, persistent submission history, and instant scoring.
                </p>
              </div>

              {/* Quick Summary Stats */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl">
                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {submissions.filter((s) => s.status === 'ACCEPTED').length}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Accepted</p>
                </div>
                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{problems.length}</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Problems</p>
                </div>
                <div className="text-center px-3">
                  <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{submissions.length}</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mt-0.5">Submissions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedbackMessage && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {feedbackMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span className="text-sm font-semibold">{feedbackMessage.text}</span>
              </div>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main View Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('challenges')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'challenges'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Coding Challenges ({problems.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'submissions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>My Past Submissions ({submissions.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSeedCurated}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all disabled:opacity-50"
                title="Populate standard curated DSA problems into the arena"
              >
                {isSeeding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span>Seed Core DSA Bank</span>
              </button>

              <button
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Generate AI Challenge</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Loading coding arena data...</p>
            </div>
          ) : activeTab === 'submissions' ? (
            /* =========================================================================
               PAST SUBMISSIONS TAB VIEW (Full Submission History with Code & Score)
               ========================================================================= */
            <div className="space-y-4">
              {/* Submission Filters Bar */}
              <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Verdict Filter:
                  </span>
                  {(['ALL', 'ACCEPTED', 'FAILED'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSubmissionFilter(filter)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        submissionFilter === filter
                          ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {filter === 'ALL' ? 'All' : filter === 'ACCEPTED' ? 'Accepted' : 'Failed / Wrong Answer'}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredSubmissions.length} of {submissions.length} submissions
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="p-16 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 space-y-3">
                  <Clock className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No submissions found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {submissionFilter !== 'ALL'
                      ? 'No submissions match your current filter.'
                      : 'You have not submitted solutions yet. Pick any problem from the Challenges tab to write code and submit for automated grading.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubmissions.map((sub) => {
                    const isAccepted = sub.status === 'ACCEPTED';
                    return (
                      <div
                        key={sub.id}
                        className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <Link
                              href={`/student/coding/${sub.problem?.slug}`}
                              className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {sub.problem?.title || 'Algorithmic Problem'}
                            </Link>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isAccepted
                                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                  : sub.status === 'COMPILATION_ERROR'
                                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                  : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                              }`}
                            >
                              {sub.status.replace(/_/g, ' ')}
                            </span>

                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                              Score: {sub.score ?? 0}%
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{sub.language}</span>
                            <span>•</span>
                            <span>{sub.testCasesPassed ?? 0}/{sub.totalTestCases ?? 0} Testcases</span>
                            <span>•</span>
                            <span>{sub.executionTimeMs}ms</span>
                            <span>•</span>
                            <span className="font-sans text-[11px]">
                              {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setInspectedSubmission(sub)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            Inspect Code & Score
                          </button>

                          <Link
                            href={`/student/coding/${sub.problem?.slug}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
                          >
                            Open Editor
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =========================================================================
               CHALLENGES TAB VIEW (Grid of Problems + Sidebar)
               ========================================================================= */
            <div className="space-y-6">
              {/* Difficulty Filter Tabs */}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Problem List */}
                <div className="lg:col-span-2 space-y-4">
                  {filteredProblems.map((problem) => {
                    const isSolved = solvedProblemSet.has(problem.id) || solvedProblemSet.has(problem.slug);
                    return (
                      <div
                        key={problem.id}
                        className={`bg-white dark:bg-slate-900/90 border rounded-xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xs ${
                          isSolved
                            ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500/60'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            {isSolved && (
                              <span title="Solved - Correctly Submitted" className="inline-flex items-center text-emerald-500 shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              </span>
                            )}
                            <Link
                              href={`/student/coding/${problem.slug}`}
                              className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                            >
                              {problem.title}
                            </Link>
                            {isSolved && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                Solved
                              </span>
                            )}
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

                          {isSolved ? (
                            <Link
                              href={`/student/coding/${problem.slug}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Try Again
                            </Link>
                          ) : (
                            <Link
                              href={`/student/coding/${problem.slug}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
                            >
                              Code & Run
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sidebar: Recent Submissions & Environment Specs */}
                <div className="space-y-6">
                  {/* Recent Submissions */}
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Your Recent Submissions
                      </h3>
                      {submissions.length > 0 && (
                        <button
                          onClick={() => setActiveTab('submissions')}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View All ({submissions.length})
                        </button>
                      )}
                    </div>

                    {submissions.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                        No submissions recorded yet. Select a problem to start coding!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {submissions.slice(0, 5).map((sub) => (
                          <div
                            key={sub.id}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                {sub.problem?.title}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {sub.score !== undefined && (
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    {sub.score}%
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    sub.status === 'ACCEPTED'
                                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                      : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                                  }`}
                                >
                                  {sub.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                              <div>
                                {sub.language} • {sub.executionTimeMs}ms
                              </div>
                              <button
                                onClick={() => setInspectedSubmission(sub)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Eye className="w-3 h-3" />
                                Inspect Code
                              </button>
                            </div>
                          </div>
                        ))}

                        {submissions.length > 5 && (
                          <button
                            onClick={() => setActiveTab('submissions')}
                            className="w-full py-2 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline border-t border-slate-100 dark:border-slate-800"
                          >
                            View all {submissions.length} submissions →
                          </button>
                        )}
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
                    <div className="text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Python:</span>
                        <span className="font-mono text-blue-600 dark:text-blue-300">v3.11 CPython</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">C++:</span>
                        <span className="font-mono text-blue-600 dark:text-blue-300">GCC 13.2 -O2 (C++20)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Java:</span>
                        <span className="font-mono text-blue-600 dark:text-blue-300">OpenJDK 21 LTS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">JavaScript:</span>
                        <span className="font-mono text-blue-600 dark:text-blue-300">Node.js 20.x V8</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                        <span className="text-slate-500 dark:text-slate-400">Default Time Limit:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">2000 ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Coding Problem Generator Modal */}
          {showAiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Generate AI Coding Problem
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Powered by Google Gemini Generative AI
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiModal(false)}
                    disabled={isGenerating}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleGenerateAiProblem} className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Topic / Data Structure
                    </label>
                    <select
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Array & Hash Table">Array & Hash Table</option>
                      <option value="Two Pointers & Sliding Window">Two Pointers & Sliding Window</option>
                      <option value="Stack & Queue">Stack & Queue</option>
                      <option value="Binary Search">Binary Search</option>
                      <option value="Linked List">Linked List</option>
                      <option value="Tree & Binary Search Tree">Tree & Binary Search Tree</option>
                      <option value="Dynamic Programming">Dynamic Programming</option>
                      <option value="String Manipulation">String Manipulation</option>
                      <option value="Recursion & Backtracking">Recursion & Backtracking</option>
                      <option value="Graph & BFS/DFS">Graph & BFS/DFS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setAiDifficulty(diff)}
                          disabled={isGenerating}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                            aiDifficulty === diff
                              ? diff === 'EASY'
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : diff === 'MEDIUM'
                                ? 'bg-amber-600 border-amber-500 text-white'
                                : 'bg-rose-600 border-rose-500 text-white'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Specific Focus or Constraint (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Focus on cycle detection, or in-place modification"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <span>
                      Gemini will synthesize the full problem description, 4-language starter codes (Python, JS, C++, Java), and automated test cases.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      disabled={isGenerating}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50 transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Challenge...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Generate Problem</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Read-Only Historical Submission Code & Score Inspection Modal */}
          {inspectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <h3 className="text-base font-bold text-white">
                        {inspectedSubmission.problem?.title || 'Historical Submission Code'}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          inspectedSubmission.status === 'ACCEPTED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : inspectedSubmission.status === 'COMPILATION_ERROR'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {inspectedSubmission.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-blue-400">
                        Score: {inspectedSubmission.score ?? 0}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Submitted on {new Date(inspectedSubmission.createdAt).toLocaleString()} • {inspectedSubmission.language} • {inspectedSubmission.testCasesPassed ?? 0}/{inspectedSubmission.totalTestCases ?? 0} test cases passed ({inspectedSubmission.executionTimeMs}ms)
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectedSubmission(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300 flex items-center justify-between">
                  <span>Read-only inspection mode. Exact historical source code as evaluated by the judge.</span>
                  {inspectedSubmission.problem?.slug && (
                    <Link
                      href={`/student/coding/${inspectedSubmission.problem.slug}`}
                      className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      Solve problem →
                    </Link>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs leading-relaxed text-blue-200 max-h-[380px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap select-text font-mono text-xs">
                    {inspectedSubmission.sourceCode || '// No source code recorded'}
                  </pre>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (inspectedSubmission.sourceCode) {
                        navigator.clipboard.writeText(inspectedSubmission.sourceCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {codeCopied ? 'Copied to Clipboard' : 'Copy Code'}
                  </button>

                  <button
                    onClick={() => setInspectedSubmission(null)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
