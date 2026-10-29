'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BookOpen,
  BrainCircuit,
  FileCheck,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Flame,
  Target,
  ArrowUpRight,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';

interface CourseOption {
  id: string;
  code: string;
  name: string;
  semester: number;
}

interface StandingData {
  rank: number;
  totalStudents: number;
  percentile: number;
  score: number;
  rawScore?: number;
  totalMarks?: number;
  assessmentScore: number;
  assessmentPercentage?: number;
  practiceScore: number;
  assessmentsCount: number;
  questionsCount: number;
  accuracy: number;
  streakDays: number;
  trend: 'UP' | 'DOWN' | 'SAME';
  gapToNext: number;
  gapToTop10: number;
  badges: string[];
}

interface RankingEntry {
  rank: number;
  studentId: string;
  userId?: string;
  name: string;
  enrollmentNumber: string;
  division: string;
  avatarSeed: string;
  score: number;
  rawScore?: number;
  totalMarks?: number;
  assessmentScore: number;
  assessmentPercentage?: number;
  practiceScore: number;
  assessmentsCount: number;
  questionsCount: number;
  accuracy: number;
  streakDays: number;
  trend: 'UP' | 'DOWN' | 'SAME';
  badges: string[];
  isCurrentUser: boolean;
}

export default function StudentLeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Filter States
  const [calculationType, setCalculationType] = useState<'composite' | 'assessments' | 'practice'>('composite');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [standing, setStanding] = useState<StandingData | null>(null);
  const [podium, setPodium] = useState<RankingEntry[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [metaInfo, setMetaInfo] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      fetchLeaderboard();
    }
  }, [user, authLoading, calculationType, selectedCourseId, selectedDivision]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: calculationType,
        ...(selectedCourseId !== 'all' ? { courseId: selectedCourseId } : {}),
        ...(selectedDivision !== 'ALL' ? { division: selectedDivision } : {}),
      });

      const res = await api.get(`/leaderboard?${queryParams.toString()}`);
      if (res && res.success) {
        setStanding(res.myStanding);
        setPodium(res.podium || []);
        setRankings(res.rankings || []);
        setCourses(res.courses || []);
        setMetaInfo(res.meta || null);
      }
    } catch {
      // Fallback state if server is busy
    } finally {
      setLoading(false);
    }
  };

  // Filter rankings by search query
  const filteredRankings = rankings.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.enrollmentNumber.toLowerCase().includes(q) ||
      r.division.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredRankings.length / pageSize) || 1;
  const paginatedRankings = filteredRankings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 border border-amber-400/40 flex items-center justify-center font-black text-sm shadow-xs">
          <Crown className="w-4 h-4 fill-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-xl bg-slate-300/30 text-slate-400 border border-slate-300/40 flex items-center justify-center font-black text-sm shadow-xs">
          <Medal className="w-4 h-4 text-slate-300 fill-slate-300" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center font-black text-sm shadow-xs">
          <Award className="w-4 h-4 text-amber-600 fill-amber-600" />
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs font-mono">
        #{rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Semester Academic Leaderboard"
          subtitle="Cohort Peer Rankings, Assessment Mark Standings & Practice Mastery"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                SEMESTER LEADERBOARD
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-xs font-semibold uppercase tracking-wider text-[#6b7fa3]">YOUR STANDING</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {standing?.rank ? `#${standing.rank}` : '--'}<span className="font-mono text-sm text-[#e05033]">{standing?.rank ? 'TH' : ''}</span>
              </strong>
              <p className="mono text-xs font-semibold text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">
                {standing ? `TOP ${(100 - standing.percentile).toFixed(1)}% IN BATCH` : 'NO PRACTICE DATA YET'}
              </p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">RANK</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{standing?.rank ? `#${standing.rank}` : '--'}</div>
              <div className="metric-label mono">CURRENT POSITION</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">SCORE</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{standing?.score ?? 0}</div>
              <div className="metric-label mono">COMPOSITE POINTS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>STREAK</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{standing?.streakDays ?? 0} DAYS</div>
              <div className="metric-label mono">ACTIVE STREAK</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">COHORT</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{standing?.totalStudents ?? 0}</div>
              <div className="metric-label mono">TOTAL COMPETITORS</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              
              <h2 className="font-display text-xl uppercase tracking-wide">SEMESTER {metaInfo?.semester || 4} ACADEMIC STANDINGS</h2>
              <p className="text-xs sm:text-sm text-[#8ba0c0] font-sans">
                Real-time percentile rankings calculated from assessment performance, adaptive practice drills, and consistency.
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
              style={{ borderRadius: 0 }}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
          </div>

          {/* MY STANDING HERO CARD */}
          {standing && (
            <div className="panel p-6 md:p-8 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--strong-border)] shadow-xs relative overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Your Standing: Rank #{standing.rank} of {standing.totalStudents}
                    </span>
                    {standing.score > 0 && (
                      <span className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Top {100 - standing.percentile < 1 ? '1%' : `${(100 - standing.percentile).toFixed(1)}%`} in Class
                      </span>
                    )}
                  </div>

                  <h3 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-white flex items-baseline gap-3">
                    <span>
                      {calculationType === 'assessments' && standing.totalMarks
                        ? `${standing.rawScore ?? standing.score} / ${standing.totalMarks}`
                        : standing.score}
                    </span>
                    <span className="text-sm font-mono font-semibold text-[#4a6fa5] dark:text-[#6a90c5]">
                      {calculationType === 'assessments' && standing.totalMarks
                        ? `Exam Marks (${standing.assessmentPercentage ?? standing.assessmentScore}%)`
                        : `/ 100 ${calculationType === 'composite' ? 'Hybrid Score' : calculationType === 'assessments' ? 'Exam Marks' : 'Practice Points'}`}
                    </span>
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
                    {standing.score === 0 && standing.questionsCount === 0 && standing.assessmentsCount === 0
                      ? 'Welcome! You haven’t completed any faculty assessments or adaptive practice sessions yet. Start practicing questions or take an exam to establish your official score and climb the class leaderboard.'
                      : standing.rank === 1
                        ? 'Outstanding achievement! You hold the top standing in your class cohort. Keep practicing to maintain your edge.'
                        : standing.gapToNext > 0
                          ? `You are only ${standing.gapToNext} points away from overtaking Rank #${standing.rank - 1}! Solve adaptive practice sessions and excel in upcoming faculty quizzes to advance.`
                          : 'Keep practicing to climb the leaderboard!'}
                  </p>
                </div>

                {/* Score Breakdown Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--surface-muted)] p-4 border border-[var(--border)] shrink-0">
                  <div className="text-center p-2">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Assessment Marks
                    </p>
                    <p className="text-xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1">
                      {standing.rawScore !== undefined && standing.totalMarks
                        ? `${standing.rawScore} / ${standing.totalMarks}`
                        : `${standing.score}`}
                    </p>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {standing.assessmentPercentage !== undefined ? `${standing.assessmentPercentage}% • 70% Weight` : '70% Weight'}
                    </span>
                  </div>

                  <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Practice Mastery
                    </p>
                    <p className="text-xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">{standing.practiceScore}%</p>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">30% Weight</span>
                  </div>

                  <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Accuracy
                    </p>
                    <p className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">{standing.accuracy}%</p>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">{standing.questionsCount} Solved</span>
                  </div>

                  <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Active Streak
                    </p>
                    <p className="text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
                      {standing.streakDays}d
                    </p>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">Daily Goal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FILTER CONTROLS BAR */}
          <div className="panel bg-[var(--surface)] border border-[var(--strong-border)] p-5 shadow-xs space-y-4">
            {/* 3 Core Calculation Mode Tabs */}
            <div className="flex border-b border-[var(--border)] pb-3 flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2 p-1 bg-[var(--surface-muted)]">
                <button
                  onClick={() => {
                    setCalculationType('composite');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${calculationType === 'composite'
                      ? 'bg-[#1a2540] dark:bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hybrid CLIAS Index (70% Exam + 30% Practice)</span>
                </button>

                <button
                  onClick={() => {
                    setCalculationType('assessments');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${calculationType === 'assessments'
                      ? 'bg-[#1a2540] dark:bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Faculty Assessments Only</span>
                </button>

                <button
                  onClick={() => {
                    setCalculationType('practice');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${calculationType === 'practice'
                      ? 'bg-[#1a2540] dark:bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Adaptive Practice Only</span>
                </button>
              </div>

              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#4a6fa5] dark:text-blue-400" />
                <span>{metaInfo?.calculationFormula || 'Calculating percentile distribution'}</span>
              </div>
            </div>

            {/* Subject Dropdown & Division & Search */}
            <div className="flex flex-col sm:row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Subject Selector */}
                <div className="relative min-w-[240px]">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a6fa5] font-semibold"
                  >
                    <option value="all">📚 All Semester Subjects (Aggregate)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Division Selector */}
                <div className="relative min-w-[130px]">
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a6fa5] font-semibold"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="CE-A">Division CE-A</option>
                    <option value="CE-B">Division CE-B</option>
                  </select>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search student or ID..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--surface-muted)] border border-[var(--border)] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a6fa5]"
                />
              </div>
            </div>
          </div>

          {/* TOP 3 PODIUM */}
          {podium.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6 pb-2">
              {/* 2nd Place (Silver) */}
              <div className="order-2 md:order-1 panel bg-[var(--surface)] border border-[var(--border)] p-6 text-center relative shadow-xs hover:border-[#4a6fa5] transition">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 shadow-md">
                  2
                </div>
                <div className="pt-3 space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                    {podium[1].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {podium[1].name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {podium[1].enrollmentNumber} • {podium[1].division}
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                    {calculationType === 'assessments' && podium[1].totalMarks
                      ? `${podium[1].rawScore ?? podium[1].score} / ${podium[1].totalMarks}`
                      : `${podium[1].score} pts`}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[1].rawScore !== undefined && podium[1].totalMarks ? `${podium[1].rawScore}/${podium[1].totalMarks} (${podium[1].assessmentPercentage ?? podium[1].assessmentScore}%)` : `${podium[1].assessmentScore}%`}</span>
                    <span>Practice: {podium[1].practiceScore}%</span>
                  </div>
                </div>
              </div>

              {/* 1st Place (Gold / Champion) */}
              <div className="order-1 md:order-2 panel bg-gradient-to-b from-amber-500/10 via-[var(--surface)] to-[var(--surface)] border-2 border-amber-500/70 p-7 text-center relative shadow-md -translate-y-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black shadow-lg">
                  <Crown className="w-6 h-6 fill-white" />
                </div>
                <div className="pt-4 space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    Cohort Champion
                  </span>
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-200 dark:ring-amber-950">
                    {podium[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">
                      {podium[0].name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {podium[0].enrollmentNumber} • {podium[0].division}
                    </p>
                  </div>
                  <div className="inline-block px-4 py-1.5 bg-amber-500 text-white text-xs font-black shadow-md">
                    {calculationType === 'assessments' && podium[0].totalMarks
                      ? `${podium[0].rawScore ?? podium[0].score} / ${podium[0].totalMarks} (${podium[0].assessmentPercentage ?? podium[0].assessmentScore}%)`
                      : `${podium[0].score} pts`}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-bold flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[0].rawScore !== undefined && podium[0].totalMarks ? `${podium[0].rawScore}/${podium[0].totalMarks} (${podium[0].assessmentPercentage ?? podium[0].assessmentScore}%)` : `${podium[0].assessmentScore}%`}</span>
                    <span>Practice: {podium[0].practiceScore}%</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place (Bronze) */}
              <div className="order-3 panel bg-[var(--surface)] border border-[var(--border)] p-6 text-center relative shadow-xs hover:border-[#4a6fa5] transition">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-amber-800/15 text-amber-800 dark:text-amber-300 border-2 border-amber-800/30 flex items-center justify-center font-black shadow-md">
                  3
                </div>
                <div className="pt-3 space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-900 text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                    {podium[2].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {podium[2].name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {podium[2].enrollmentNumber} • {podium[2].division}
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-xs font-black text-amber-900 dark:text-amber-300">
                    {calculationType === 'assessments' && podium[2].totalMarks
                      ? `${podium[2].rawScore ?? podium[2].score} / ${podium[2].totalMarks}`
                      : `${podium[2].score} pts`}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[2].rawScore !== undefined && podium[2].totalMarks ? `${podium[2].rawScore}/${podium[2].totalMarks} (${podium[2].assessmentPercentage ?? podium[2].assessmentScore}%)` : `${podium[2].assessmentScore}%`}</span>
                    <span>Practice: {podium[2].practiceScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FULL CLASS RANKINGS TABLE */}
          <div className="panel bg-[var(--surface)] border border-[var(--strong-border)] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4a6fa5] dark:text-blue-400" />
                <span>Full Semester Roster Standings ({filteredRankings.length} Students)</span>
              </h3>
              
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)] text-slate-700 dark:text-slate-300 border-b border-[var(--border)] font-mono font-bold uppercase tracking-wider text-xs">
                    <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Student &amp; Enrollment ID</th>
                    <th className="py-3.5 px-3">Division</th>
                    <th className="py-3.5 px-4 text-center">Trend</th>
                    <th className="py-3.5 px-4 text-right">
                      {calculationType === 'composite' ? 'Hybrid CLIAS Score' : calculationType === 'assessments' ? 'Exam Marks' : 'Practice Points'}
                    </th>
                    <th className="py-3.5 px-4 text-right">Faculty Exam Marks</th>
                    <th className="py-3.5 px-4 text-right">Adaptive Practice</th>
                    <th className="py-3.5 px-4">Key Achievements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedRankings.map((student) => {
                    const isMe = student.isCurrentUser;
                    return (
                      <tr
                        key={student.studentId}
                        className={`transition hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ${isMe
                            ? 'bg-blue-500/10 dark:bg-blue-950/40 border-l-4 border-l-[#4a6fa5] font-medium'
                            : ''
                          }`}
                      >
                        <td className="py-3.5 px-4 text-center">{getRankBadge(student.rank)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 font-bold text-xs flex items-center justify-center shrink-0 ${isMe
                                  ? 'bg-[#1a2540] dark:bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                              {student.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                                <span>{student.name}</span>
                                {isMe && (
                                  <span className="text-xs font-mono font-black uppercase px-2 py-0.5 bg-[#4a6fa5] text-white">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono font-semibold">
                                {student.enrollmentNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            {student.division}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {student.trend === 'UP' && (
                            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400" title="Moving Up">
                              <TrendingUp className="w-4 h-4" />
                            </span>
                          )}
                          {student.trend === 'DOWN' && (
                            <span className="inline-flex items-center text-rose-500" title="Rank Dropped">
                              <TrendingDown className="w-4 h-4" />
                            </span>
                          )}
                          {student.trend === 'SAME' && (
                            <span className="inline-flex items-center text-slate-400" title="Stable Position">
                              <Minus className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-base text-[#4a6fa5] dark:text-blue-400">
                            {calculationType === 'assessments' && student.totalMarks
                              ? `${student.rawScore ?? student.score} / ${student.totalMarks}`
                              : student.score}
                          </span>
                          {calculationType === 'assessments' && student.assessmentPercentage !== undefined && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                              {student.assessmentPercentage}%
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                            {student.rawScore !== undefined && student.totalMarks
                              ? `${student.rawScore} / ${student.totalMarks}`
                              : `${student.assessmentScore}`}
                            {student.assessmentPercentage !== undefined ? ` (${student.assessmentPercentage}%)` : ''}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 block">
                            {student.assessmentsCount} tests
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                            {student.practiceScore}%
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 block">
                            {student.questionsCount} Qs ({student.accuracy}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {student.badges.map((b, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedRankings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        No students found for this division or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  Page {currentPage} of {totalPages} ({filteredRankings.length} students)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-[var(--border)] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-[var(--border)] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
