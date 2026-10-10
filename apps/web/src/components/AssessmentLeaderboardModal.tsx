'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Trophy,
  Award,
  Medal,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  X,
  RotateCcw,
  Download,
  Sparkles,
  TrendingUp,
  Percent,
} from 'lucide-react';

export interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  division: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  durationSeconds: number | null;
  attemptNumber: number;
  submittedAt: string;
  isCurrentUser: boolean;
}

export interface LeaderboardData {
  assessmentId: string;
  title: string;
  code: string;
  division: string;
  courseCode: string;
  courseName: string;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number;
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  currentUser: {
    rank: number | null;
    score: number;
    percentage: number;
    percentile: number | null;
    durationSeconds: number | null;
    passed: boolean;
  } | null;
  rankings: LeaderboardEntry[];
}

export interface AssessmentLeaderboardViewProps {
  assessmentId: string;
  assessmentTitle?: string;
  isFacultyView?: boolean;
  onClose?: () => void;
  showHeader?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function AssessmentLeaderboardView({
  assessmentId,
  assessmentTitle,
  isFacultyView = false,
  onClose,
  showHeader = true,
}: AssessmentLeaderboardViewProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');

  useEffect(() => {
    if (assessmentId) {
      loadLeaderboard();
    }
  }, [assessmentId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/assessments/${assessmentId}/leaderboard`);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load assessment leaderboard', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to fetch dynamic leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRankings = (data?.rankings || []).filter((item) => {
    const matchesDiv =
      selectedDivision === 'ALL' ||
      item.division.toUpperCase() === selectedDivision.toUpperCase() ||
      (selectedDivision === 'DIV 1' && item.division.includes('1')) ||
      (selectedDivision === 'DIV 2' && item.division.includes('2'));

    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      item.studentName.toLowerCase().includes(searchLower) ||
      item.enrollmentNumber.toLowerCase().includes(searchLower);

    return matchesDiv && matchesSearch;
  });

  const top1 = data?.rankings[0];
  const top2 = data?.rankings[1];
  const top3 = data?.rankings[2];

  const exportCsv = () => {
    if (!data || !data.rankings || data.rankings.length === 0) {
      alert('No ranking entries to export.');
      return;
    }

    const headers = [
      'Rank',
      'Student Name',
      'Enrollment Number',
      'Division',
      'Score Obtained',
      'Total Marks',
      'Percentage (%)',
      'Status',
      'Duration (sec)',
      'Attempt Number',
      'Submission Timestamp',
    ];

    const rows = data.rankings.map((r) => [
      r.rank,
      `"${r.studentName}"`,
      `"${r.enrollmentNumber}"`,
      `"${r.division}"`,
      r.score,
      r.totalMarks,
      `${r.percentage}%`,
      r.passed ? 'PASSED' : 'RETAKE',
      r.durationSeconds ?? 'N/A',
      r.attemptNumber,
      `"${new Date(r.submittedAt).toISOString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Leaderboard_${data.code || data.assessmentId}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header Bar */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                  {data?.courseCode || 'Assessment'} • {data?.code || 'LEADERBOARD'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Live Dynamic Ranks
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {data?.title || assessmentTitle || 'Assessment Leaderboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              title="Refresh Leaderboard"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {isFacultyView && (
              <button
                onClick={exportCsv}
                disabled={loading || !data?.rankings?.length}
                title="Export Rankings CSV"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading && !data ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">
              Calculating real-time assessment standings...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800 space-y-2">
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={loadLeaderboard}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <>
            {/* Cohort Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Participants
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5 mt-0.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {data.totalParticipants}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Top Score
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-500 flex items-center justify-center gap-1.5 mt-0.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  {data.highestScore}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {data.totalMarks}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Class Average
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  {data.averageScore}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Pass Rate
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 mt-0.5">
                  <Percent className="w-4 h-4 text-emerald-500" />
                  {data.passRate}%
                </span>
              </div>
            </div>

            {/* Current Student's Rank Banner (if student attempted) */}
            {data.currentUser && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                    #{data.currentUser.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Your Performance
                      </span>
                      {data.currentUser.passed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          PASSED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          RETAKE
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      You ranked #{data.currentUser.rank} out of {data.totalParticipants} students
                      {data.currentUser.percentile ? ` (Top ${Math.round(100 - data.currentUser.percentile + 1)}%)` : ''}!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 border-indigo-200/50 dark:border-indigo-800/50 pt-2 sm:pt-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Your Score</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {data.currentUser.score} / {data.totalMarks}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Percentage</span>
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {data.currentUser.percentage}%
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Duration</span>
                    <span className="text-base font-black text-slate-700 dark:text-slate-300 font-mono">
                      {formatDuration(data.currentUser.durationSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Podium View for Top 3 (if at least 2 participants) */}
            {data.rankings.length >= 2 && (
              <div className="py-2">
                <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-lg mx-auto">
                  {/* 2nd Place */}
                  {top2 && (
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-400 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                        🥈
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white text-center truncate max-w-[100px]">
                        {top2.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{top2.enrollmentNumber}</span>
                      <div className="w-full mt-2 pt-3 pb-2 px-2 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/60 rounded-t-2xl border-t border-x border-slate-300 dark:border-slate-700 text-center shadow-xs">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                          {top2.score} pts
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {top2.percentage}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Center - Elevated) */}
                  {top1 && (
                    <div className="flex-1 flex flex-col items-center -mt-4">
                      <div className="relative mb-2">
                        <Sparkles className="w-4 h-4 text-amber-400 absolute -top-3 -right-2 animate-bounce" />
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-amber-950 border-2 border-amber-300 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
                          🥇
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 text-center truncate max-w-[120px]">
                        {top1.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{top1.enrollmentNumber}</span>
                      <div className="w-full mt-2 pt-5 pb-3 px-2 bg-gradient-to-t from-amber-200/80 to-amber-100 dark:from-amber-950/70 dark:to-amber-900/40 rounded-t-2xl border-t-2 border-x-2 border-amber-400/60 text-center shadow-md">
                        <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 block">
                          {top1.score} pts
                        </span>
                        <span className="text-[10px] font-bold text-amber-800/80 dark:text-amber-400/80 block">
                          {top1.percentage}% (1st)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3 && (
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-700/30 text-amber-700 dark:text-amber-400 border-2 border-amber-600/40 flex items-center justify-center font-bold text-sm shadow-md mb-2">
                        🥉
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white text-center truncate max-w-[100px]">
                        {top3.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{top3.enrollmentNumber}</span>
                      <div className="w-full mt-2 pt-2 pb-2 px-2 bg-gradient-to-t from-amber-900/20 to-amber-900/10 dark:from-slate-850 dark:to-slate-800/50 rounded-t-2xl border-t border-x border-slate-200 dark:border-slate-700 text-center shadow-xs">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                          {top3.score} pts
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {top3.percentage}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or enrollment..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">All Divisions</option>
                  <option value="DIV 1">Division A (DIV 1)</option>
                  <option value="DIV 2">Division B (DIV 2)</option>
                </select>

                <span className="text-xs text-slate-400 whitespace-nowrap pl-1">
                  {filteredRankings.length} of {data.totalParticipants} ranked
                </span>
              </div>
            </div>

            {/* Full Dynamic Leaderboard Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-center w-16">Rank</th>
                      <th className="px-4 py-3">Student Details</th>
                      <th className="px-4 py-3">Division</th>
                      <th className="px-4 py-3">Score Obtained</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredRankings.map((entry) => {
                      const isTop1 = entry.rank === 1;
                      const isTop2 = entry.rank === 2;
                      const isTop3 = entry.rank === 3;

                      return (
                        <tr
                          key={entry.submissionId || entry.studentId}
                          className={`transition ${
                            entry.isCurrentUser
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-l-indigo-600 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {/* Rank Badge */}
                          <td className="px-4 py-3 text-center">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs shadow-xs">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/30 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs">
                                #{entry.rank}
                              </span>
                            )}
                          </td>

                          {/* Student Details */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {entry.studentName}
                                </span>
                                {entry.isCurrentUser && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-600 text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                {entry.enrollmentNumber}
                              </span>
                            </div>
                          </td>

                          {/* Division */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {entry.division}
                            </span>
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3">
                            <span className="text-slate-900 dark:text-white font-extrabold text-sm">
                              {entry.score}{' '}
                              <span className="text-slate-400 text-xs font-normal">
                                / {entry.totalMarks}
                              </span>
                            </span>
                          </td>

                          {/* Percentage */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                entry.percentage >= 60
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : entry.percentage >= 40
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {entry.percentage}%
                            </span>
                          </td>

                          {/* Duration */}
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                            {formatDuration(entry.durationSeconds)}
                          </td>

                          {/* Outcome */}
                          <td className="px-4 py-3">
                            {entry.passed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                <XCircle className="w-3.5 h-3.5" />
                                RETAKE
                              </span>
                            )}
                          </td>

                          {/* Submitted Date */}
                          <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                            {new Date(entry.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRankings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          No students match your filter criteria or have submitted attempts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

interface AssessmentLeaderboardModalProps {
  assessmentId: string;
  assessmentTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  isFacultyView?: boolean;
}

export function AssessmentLeaderboardModal({
  assessmentId,
  assessmentTitle,
  isOpen,
  onClose,
  isFacultyView = false,
}: AssessmentLeaderboardModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <AssessmentLeaderboardView
          assessmentId={assessmentId}
          assessmentTitle={assessmentTitle}
          isFacultyView={isFacultyView}
          onClose={onClose}
          showHeader={true}
        />
      </div>
    </div>
  );
}
