'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  FileSearch,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Code,
  Terminal,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

interface ProblemOption {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
}

interface PlagiarismMatch {
  id: string;
  scanId: string;
  similarityScore: number;
  matchedTokensCount: number;
  verdict: 'SUSPICIOUS' | 'FLAGGED' | 'CLEARED' | 'PENALIZED';
  facultyNotes?: string;
  fingerprintOverlap?: string;
  submissionA: {
    id: string;
    language: string;
    sourceCode: string;
    student: {
      authorizedStudent: {
        name: string;
        enrollmentNumber: string;
      };
    };
  };
  submissionB: {
    id: string;
    language: string;
    sourceCode: string;
    student: {
      authorizedStudent: {
        name: string;
        enrollmentNumber: string;
      };
    };
  };
}

interface PlagiarismScan {
  id: string;
  problemId: string;
  problem: {
    title: string;
    slug: string;
    difficulty: string;
  };
  status: string;
  threshold: number;
  totalSubmissionsScanned: number;
  flaggedPairsCount: number;
  createdAt: string;
  matches?: PlagiarismMatch[];
  _count?: { matches: number };
}

export default function FacultyPlagiarismPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [problems, setProblems] = useState<ProblemOption[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [scans, setScans] = useState<PlagiarismScan[]>([]);
  const [activeScan, setActiveScan] = useState<PlagiarismScan | null>(null);
  const [threshold, setThreshold] = useState<number>(70);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<PlagiarismMatch | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadInitialData();
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [problemsRes, scansRes] = await Promise.all([
        api.get('/coding/problems'),
        api.get('/plagiarism/scans'),
      ]);

      setProblems(problemsRes || []);
      setScans(scansRes || []);

      if (problemsRes && problemsRes.length > 0) {
        setSelectedProblemId(problemsRes[0].id);
      }

      if (scansRes && scansRes.length > 0) {
        loadScanDetails(scansRes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load plagiarism data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadScanDetails = async (scanId: string) => {
    try {
      const details = await api.get(`/plagiarism/scans/${scanId}`);
      setActiveScan(details);
      if (details.matches && details.matches.length > 0) {
        setSelectedMatch(details.matches[0]);
      } else {
        setSelectedMatch(null);
      }
    } catch (err: any) {
      console.error('Failed to load scan details:', err);
    }
  };

  const handleTriggerScan = async () => {
    if (!selectedProblemId) return;
    setScanning(true);
    setStatusMessage(null);
    try {
      const newScan = await api.post('/plagiarism/scan', {
        problemId: selectedProblemId,
        threshold,
      });

      setStatusMessage(`Scan completed! Identified ${newScan.flaggedPairsCount} suspect match(es).`);
      await loadInitialData();
      await loadScanDetails(newScan.id);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to run plagiarism scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateVerdict = async (verdict: 'FLAGGED' | 'CLEARED' | 'PENALIZED') => {
    if (!selectedMatch) return;
    try {
      const updated = await api.patch(`/plagiarism/matches/${selectedMatch.id}`, {
        verdict,
        facultyNotes: `Faculty evaluation updated to ${verdict} on ${new Date().toLocaleDateString()}.`,
      });

      setSelectedMatch((prev) => (prev ? { ...prev, verdict: updated.verdict } : null));

      if (activeScan) {
        setActiveScan({
          ...activeScan,
          matches: activeScan.matches?.map((m) =>
            m.id === selectedMatch.id ? { ...m, verdict: updated.verdict } : m
          ),
        });
      }
    } catch (err: any) {
      console.error('Failed to update match verdict:', err);
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/60 via-red-950/40 to-slate-900 border border-rose-500/20 p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Phase 12: Code Plagiarism & AST Clone Detection
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    AST Winnowing Algorithm
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Plagiarism Audit & Code Similarity Studio
                </h1>
                <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                  Evaluate student submissions for unauthorized collaboration using structural token hashing,
                  variable-invariant normalization, and winnowing k-gram fingerprint analysis.
                </p>
              </div>

              {/* Scan Trigger Console */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3 min-w-[320px]">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-rose-400" />
                    Target Problem
                  </label>
                  <span className="text-xs text-slate-400 font-mono">Min: {threshold}%</span>
                </div>

                <select
                  value={selectedProblemId}
                  onChange={(e) => setSelectedProblemId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500"
                >
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Similarity Threshold:</span>
                    <span className="font-bold text-rose-400">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleTriggerScan}
                  disabled={scanning}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Comparing AST Fingerprints...
                    </>
                  ) : (
                    <>
                      <GitCompare className="w-3.5 h-3.5" />
                      Run Plagiarism Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className="mt-4 px-4 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {statusMessage}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
              <p className="text-sm font-medium">Loading structural plagiarism telemetry...</p>
            </div>
          ) : (
            <>
              {/* Scan Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submissions Evaluated</span>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {activeScan?.totalSubmissionsScanned ?? 0}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Cross-student comparisons</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flagged Suspect Pairs</span>
                  <div className="text-3xl font-extrabold text-rose-400 mt-2">
                    {activeScan?.flaggedPairsCount ?? 0}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">&ge; {activeScan?.threshold ?? 70}% token overlap</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Congruence Score</span>
                  <div className="text-3xl font-extrabold text-amber-400 mt-2">
                    {activeScan?.matches?.[0]?.similarityScore ?? 0}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Abstract Syntax Jaccard Index</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plagiarism Normalization</span>
                  <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Renaming Invariant
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Identifiers, comments & whitespace stripped</p>
                </div>
              </div>

              {/* Match Inspector & Dual Code Diff */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Flagged Matches List (4 Cols) */}
                <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 max-h-[750px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Detected Pairwise Clones
                    </h3>
                    <span className="text-xs text-slate-400">
                      {activeScan?.matches?.length ?? 0} Pair(s)
                    </span>
                  </div>

                  {!activeScan?.matches || activeScan.matches.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No plagiarism matches detected above the {activeScan?.threshold || 70}% threshold.
                    </div>
                  ) : (
                    activeScan.matches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                          selectedMatch?.id === match.id
                            ? 'bg-rose-950/30 border-rose-500 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                            <GitCompare className="w-3.5 h-3.5" />
                            {match.similarityScore}% Overlap
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              match.verdict === 'FLAGGED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : match.verdict === 'PENALIZED'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : match.verdict === 'CLEARED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {match.verdict}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Student A:</span>
                            <span className="font-semibold text-white">
                              {match.submissionA.student.authorizedStudent.name} (
                              {match.submissionA.student.authorizedStudent.enrollmentNumber})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Student B:</span>
                            <span className="font-semibold text-white">
                              {match.submissionB.student.authorizedStudent.name} (
                              {match.submissionB.student.authorizedStudent.enrollmentNumber})
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{match.matchedTokensCount} shared tokens</span>
                          <span className="text-indigo-400 flex items-center gap-0.5">
                            Inspect Diff <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right: Side-by-Side Code Diff & Review Console (8 Cols) */}
                <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  {!selectedMatch ? (
                    <div className="py-24 text-center text-slate-400 text-xs">
                      Select a pairwise match from the left panel to inspect structural code diff.
                    </div>
                  ) : (
                    <>
                      {/* Diff Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">
                              Structural Diff & Token Overlap Analysis
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {selectedMatch.similarityScore}% Congruence
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Normalized AST tokens reveal near-identical algorithmic logic and control flow despite variable renaming.
                          </p>
                        </div>

                        {/* Faculty Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateVerdict('CLEARED')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleUpdateVerdict('FLAGGED')}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            Flag Suspect
                          </button>
                          <button
                            onClick={() => handleUpdateVerdict('PENALIZED')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
                          >
                            Penalize (0 Grade)
                          </button>
                        </div>
                      </div>

                      {/* Dual Code Viewer */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Student A Code Pane */}
                        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
                          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {selectedMatch.submissionA.student.authorizedStudent.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {selectedMatch.submissionA.student.authorizedStudent.enrollmentNumber} •{' '}
                              {selectedMatch.submissionA.language}
                            </span>
                          </div>
                          <div className="p-4 font-mono text-xs text-blue-200 overflow-x-auto leading-relaxed whitespace-pre">
                            {selectedMatch.submissionA.sourceCode}
                          </div>
                        </div>

                        {/* Student B Code Pane */}
                        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
                          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {selectedMatch.submissionB.student.authorizedStudent.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {selectedMatch.submissionB.student.authorizedStudent.enrollmentNumber} •{' '}
                              {selectedMatch.submissionB.language}
                            </span>
                          </div>
                          <div className="p-4 font-mono text-xs text-purple-200 overflow-x-auto leading-relaxed whitespace-pre">
                            {selectedMatch.submissionB.sourceCode}
                          </div>
                        </div>
                      </div>

                      {/* Overlap & AST Diagnostic Details */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          Algorithmic Winnowing Diagnostics
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {selectedMatch.facultyNotes ||
                            'High-order AST token congruence detected in loop invariant and dictionary complement retrieval.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
