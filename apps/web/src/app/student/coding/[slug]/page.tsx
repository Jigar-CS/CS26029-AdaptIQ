'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Code,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowLeft,
  Terminal,
  FileCode,
  BookOpen,
  Eye,
  Copy,
  Check,
  X,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
  order: number;
}

interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  starterCodes: string;
  constraints: string;
  hints?: string;
  tags?: string;
  testCases: TestCase[];
}

interface TestResultDetail {
  testCaseNumber?: number;
  testCase?: number;
  status: 'PASSED' | 'FAILED';
  input?: string;
  expectedOutput?: string;
  expected?: string;
  actualOutput?: string;
  actual?: string;
  executionTimeMs?: number;
  timeMs?: number;
  consoleOutput?: string;
}

interface ExecutionVerdict {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED';
  score?: number;
  totalTestCases: number;
  testCasesPassed: number;
  executionTimeMs: number;
  memoryKb?: number;
  memoryUsedKb?: number;
  outputMessage?: string;
  feedback?: string;
  testResults?: TestResultDetail[];
  judgeDetails?: TestResultDetail[];
}

interface SubmissionRecord {
  id: string;
  problemId: string;
  studentId: string;
  language: string;
  sourceCode: string;
  status: string;
  score: number;
  testCasesPassed: number;
  totalTestCases: number;
  executionTimeMs: number;
  memoryUsedKb: number;
  createdAt: string;
  problem?: {
    id?: string;
    title: string;
    slug: string;
    difficulty?: string;
  };
}

export default function ProblemEditorPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPinned } = useSidebar();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('PYTHON');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [starterCodesMap, setStarterCodesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<ExecutionVerdict | null>(null);
  const [selectedTestTab, setSelectedTestTab] = useState<number>(0);
  const [showHints, setShowHints] = useState<boolean>(false);

  // Submission history & inspection state
  const [leftTab, setLeftTab] = useState<'problem' | 'submissions'>('problem');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<SubmissionRecord[]>([]);
  const [submissionScope, setSubmissionScope] = useState<'problem' | 'all'>('problem');
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [inspectedSubmission, setInspectedSubmission] = useState<SubmissionRecord | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'ACCEPTED' | 'FAILED'>('ALL');
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && slug) {
      loadProblem();
    }
  }, [user, authLoading, slug]);

  const loadSubmissions = async (problemIdOrSlug?: string) => {
    setLoadingSubmissions(true);
    try {
      const targetProb = problemIdOrSlug || problem?.id || slug;
      const [probSubs, allSubs] = await Promise.all([
        targetProb ? api.get(`/coding/submissions?problemId=${targetProb}`) : Promise.resolve([]),
        api.get('/coding/submissions'),
      ]);
      setSubmissions(Array.isArray(probSubs) ? probSubs : []);
      setAllSubmissions(Array.isArray(allSubs) ? allSubs : []);
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/coding/problems/${slug}`);
      setProblem(data);

      let parsedStarters: Record<string, string> = {};
      try {
        parsedStarters = JSON.parse(data.starterCodes);
      } catch {
        parsedStarters = { PYTHON: '# Write your solution here' };
      }
      setStarterCodesMap(parsedStarters);
      setSourceCode(parsedStarters[selectedLanguage] || '# Write your solution here');

      loadSubmissions(data?.id || (Array.isArray(slug) ? slug[0] : slug));
    } catch (err: any) {
      console.error('Failed to load problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (starterCodesMap[newLang]) {
      setSourceCode(starterCodesMap[newLang]);
    }
    setVerdict(null);
  };

  const handleReset = () => {
    if (starterCodesMap[selectedLanguage]) {
      setSourceCode(starterCodesMap[selectedLanguage]);
    }
    setVerdict(null);
  };

  const handleRunCode = async () => {
    if (!problem) return;
    setExecuting(true);
    setVerdict(null);
    try {
      const res = await api.post(`/coding/problems/${problem.id}/run`, {
        language: selectedLanguage,
        sourceCode,
      });
      setVerdict(res);
      setSelectedTestTab(0);
    } catch (err: any) {
      console.error('Failed to run code:', err);
      setVerdict({
        status: 'RUNTIME_ERROR',
        totalTestCases: 0,
        testCasesPassed: 0,
        executionTimeMs: 0,
        outputMessage: err.message || 'Server error while running code.',
        testResults: [],
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!problem) return;
    setExecuting(true);
    setVerdict(null);
    try {
      const res = await api.post(`/coding/problems/${problem.id}/submit`, {
        language: selectedLanguage,
        sourceCode,
      });
      setVerdict(res.verdict);
      setSelectedTestTab(0);
      loadSubmissions(problem.id);
    } catch (err: any) {
      console.error('Failed to submit code:', err);
      setVerdict({
        status: 'RUNTIME_ERROR',
        totalTestCases: 0,
        testCasesPassed: 0,
        executionTimeMs: 0,
        outputMessage: err.message || 'Server error while submitting code.',
        testResults: [],
      });
    } finally {
      setExecuting(false);
    }
  };

  const testList = verdict?.testResults || verdict?.judgeDetails || [];

  const currentList = submissionScope === 'problem' ? submissions : allSubmissions;
  const filteredSubmissions = currentList.filter((sub) => {
    if (submissionFilter === 'ALL') return true;
    if (submissionFilter === 'ACCEPTED') return sub.status === 'ACCEPTED';
    if (submissionFilter === 'FAILED') return sub.status !== 'ACCEPTED';
    return true;
  });

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar />

        <main className="p-6 max-w-[1600px] w-full mx-auto space-y-4">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/student/coding"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Coding Library
            </Link>

            <div className="flex items-center gap-3">
              {submissions.some((s) => s.status === 'ACCEPTED') && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Solved
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${problem?.difficulty === 'EASY'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : problem?.difficulty === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
              >
                {problem?.difficulty || 'MEDIUM'}
              </span>
              <span className="text-xs text-slate-400">Problem #{problem?.slug}</span>
            </div>
          </div>

          {loading || !problem ? (
            <div className="p-16 text-center text-slate-400 text-sm">
              Loading code execution environment...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Pane: Problem Description & Submissions (5 Cols) */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 max-h-[820px] overflow-y-auto">
                {/* Left Pane Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setLeftTab('problem')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      leftTab === 'problem'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Problem
                  </button>
                  <button
                    onClick={() => {
                      setLeftTab('submissions');
                      if (problem) loadSubmissions(problem.id);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      leftTab === 'submissions'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Submissions
                    {submissions.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/80 text-blue-300 border border-blue-500/30">
                        {submissions.length}
                      </span>
                    )}
                  </button>
                </div>

                {leftTab === 'submissions' ? (
                  <div className="space-y-4">
                    {/* Scope & Filter Controls */}
                    <div className="flex flex-col gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        {/* Scope Switcher: This Problem vs All Problems */}
                        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                          <button
                            onClick={() => setSubmissionScope('problem')}
                            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                              submissionScope === 'problem'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            This Problem ({submissions.length})
                          </button>
                          <button
                            onClick={() => setSubmissionScope('all')}
                            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                              submissionScope === 'all'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            All Problems ({allSubmissions.length})
                          </button>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1">
                          {(['ALL', 'ACCEPTED', 'FAILED'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setSubmissionFilter(f)}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                                submissionFilter === f
                                  ? 'bg-slate-800 text-white border border-slate-700'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {f === 'ALL' ? 'All' : f === 'ACCEPTED' ? 'Pass' : 'Fail'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {loadingSubmissions ? (
                      <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Cpu className="w-4 h-4 animate-spin text-blue-400" />
                        Loading previous submissions...
                      </div>
                    ) : filteredSubmissions.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-300">No submissions found</p>
                        <p className="text-[11px] text-slate-500">
                          {submissionScope === 'problem'
                            ? 'Submit your solution using the editor on the right to test it against judge test cases.'
                            : 'You have not submitted any solutions in the arena yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredSubmissions.map((sub) => {
                          const isPass = sub.status === 'ACCEPTED';
                          return (
                            <div
                              key={sub.id}
                              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      isPass
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : sub.status === 'COMPILATION_ERROR'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    }`}
                                  >
                                    {sub.status.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[11px] font-bold text-blue-400">
                                    Score: {sub.score ?? 0}%
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {sub.problem?.title && submissionScope === 'all' && (
                                <div className="text-xs font-semibold text-slate-300 truncate">
                                  {sub.problem.title}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-300 font-mono">{sub.language}</span>
                                  <span>
                                    {sub.testCasesPassed ?? 0}/{sub.totalTestCases ?? 0} Passed
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    {sub.executionTimeMs}ms
                                  </span>
                                </div>

                                <button
                                  onClick={() => setInspectedSubmission(sub)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Inspect Code
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        {submissions.some((s) => s.status === 'ACCEPTED') && (
                          <span title="Solved - Correctly Submitted" className="inline-flex items-center text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          </span>
                        )}
                        <span>{problem.title}</span>
                      </h1>
                      {problem.tags && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {problem.tags.split(',').map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60"
                            >
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Description Text */}
                    <div className="text-slate-300 text-xs leading-relaxed space-y-3 whitespace-pre-line font-normal">
                      {problem.description}
                    </div>

                    {/* Sample Testcases */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Example Test Cases
                      </h3>
                      {problem.testCases.map((tc, idx) => (
                        <div
                          key={tc.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-[11px]"
                        >
                          <div className="text-slate-400 text-[10px] uppercase font-bold font-sans">
                            Example {idx + 1}:
                          </div>
                          <div>
                            <span className="text-slate-400">Input: </span>
                            <span className="text-blue-300">{tc.input}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Output: </span>
                            <span className="text-emerald-300">{tc.expectedOutput}</span>
                          </div>
                          {tc.explanation && (
                            <div className="text-slate-400 font-sans text-[10px] pt-1 border-t border-slate-800/80">
                              {tc.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Constraints */}
                    <div className="space-y-2 pt-4 border-t border-slate-800">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Constraints</h3>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 font-mono text-[11px] whitespace-pre-line">
                        {problem.constraints}
                      </div>
                    </div>

                    {/* Hints Accordion */}
                    {problem.hints && (
                      <div className="pt-2">
                        <button
                          onClick={() => setShowHints(!showHints)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-semibold text-indigo-300 hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Algorithmic Hints & Approach
                          </span>
                          {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showHints && (
                          <div className="mt-2 p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-2 animate-fadeIn">
                            {JSON.parse(problem.hints).map((hint: string, hIdx: number) => (
                              <div key={hIdx} className="flex items-start gap-2">
                                <span className="text-indigo-400 font-bold">•</span>
                                <span className="leading-relaxed">{hint}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Pane: Code Editor & Live Console (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Editor Header */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-t-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Language:
                    </span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="PYTHON">Python 3.11</option>
                      <option value="JAVASCRIPT">JavaScript (Node.js)</option>
                      <option value="CPP">C++20 (GCC 13)</option>
                      <option value="JAVA">Java 21 (OpenJDK)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Reset Starter Code"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleRunCode}
                      disabled={executing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      Run Code
                    </button>

                    <button
                      onClick={handleSubmitCode}
                      disabled={executing}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit
                    </button>
                  </div>
                </div>

                {/* Code Textarea Editor */}
                <div className="bg-slate-950 border border-slate-800 border-t-0 p-4 font-mono text-xs leading-relaxed text-slate-200">
                  <textarea
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    rows={17}
                    spellCheck={false}
                    className="w-full bg-transparent resize-y outline-none font-mono text-xs leading-relaxed text-blue-200"
                    placeholder="// Write your algorithmic solution here..."
                  />
                </div>

                {/* Live Judge Output / Verdict Console */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-b-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Judge Execution Console
                      </span>
                    </div>

                    {verdict && (
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${verdict.status === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : verdict.status === 'COMPILATION_ERROR'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : verdict.status === 'TIME_LIMIT_EXCEEDED'
                                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                        >
                          {verdict.status.replace(/_/g, ' ')}
                        </span>
                        {verdict.score !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Score: {verdict.score}%
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {verdict.testCasesPassed}/{verdict.totalTestCases} Passed
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {verdict.executionTimeMs}ms
                        </span>
                      </div>
                    )}
                  </div>

                  {executing ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Cpu className="w-4 h-4 animate-spin text-blue-400" />
                      Sandboxing code and evaluating test assertions...
                    </div>
                  ) : !verdict ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Click <strong className="text-slate-300">Run Code</strong> to validate against sample cases, or <strong className="text-emerald-400">Submit</strong> for full judge grading.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Test Case Tab Selector */}
                      {testList.length > 0 && (
                        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          {testList.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedTestTab(idx)}
                              className={`text-xs font-semibold px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${selectedTestTab === idx
                                  ? 'bg-slate-800 text-white'
                                  : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                              {t.status === 'PASSED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected Test Case Details */}
                      {testList[selectedTestTab] && (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
                          <div>
                            <span className="text-slate-400">Input: </span>
                            <span className="text-slate-200">
                              {testList[selectedTestTab].input}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Expected Output: </span>
                            <span className="text-emerald-300">
                              {testList[selectedTestTab].expectedOutput ?? testList[selectedTestTab].expected ?? '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Actual Output: </span>
                            <span
                              className={
                                testList[selectedTestTab].status === 'PASSED'
                                  ? 'text-emerald-300'
                                  : 'text-rose-300'
                              }
                            >
                              {(() => {
                                const out = testList[selectedTestTab].actualOutput !== undefined && testList[selectedTestTab].actualOutput !== null
                                  ? testList[selectedTestTab].actualOutput
                                  : testList[selectedTestTab].actual !== undefined && testList[selectedTestTab].actual !== null
                                    ? testList[selectedTestTab].actual
                                    : null;
                                return out !== null && out !== '' ? out : '(no output)';
                              })()}
                            </span>
                          </div>
                          {testList[selectedTestTab].consoleOutput && (
                            <div className="pt-2 border-t border-slate-800/80">
                              <span className="text-slate-400">Stdout / Console: </span>
                              <pre className="text-amber-300 text-[11px] mt-1 whitespace-pre-wrap font-mono">
                                {testList[selectedTestTab].consoleOutput}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {verdict.outputMessage && (
                        <div className={`text-xs p-3 rounded-lg border font-mono whitespace-pre-wrap ${verdict.status === 'ACCEPTED'
                            ? 'bg-emerald-950/20 text-emerald-300 border-emerald-800/40'
                            : verdict.status === 'COMPILATION_ERROR'
                              ? 'bg-amber-950/30 text-amber-200 border-amber-800/40'
                              : 'bg-rose-950/30 text-rose-200 border-rose-800/40'
                          }`}>
                          {verdict.outputMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Read-Only Historical Submission Code Modal */}
          {inspectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden space-y-4 p-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">
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

                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300">
                  Read-only view. Closing this modal preserves your current working draft in the editor.
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
