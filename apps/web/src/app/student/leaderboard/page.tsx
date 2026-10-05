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
  assessmentScore: number;
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
  assessmentScore: number;
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Semester Academic Leaderboard"
          subtitle="Cohort Peer Rankings, Assessment Mark Standings & Practice Mastery"
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-200">
          {/* Header Action Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>Semester {metaInfo?.semester || 4} Academic Standings</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      CHARUSAT CSPIT
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Evaluate your competitive percentile across university subjects and track your progress to the top 10.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchLeaderboard}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Standings</span>
              </button>
            </div>
          </div>

          {/* MY STANDING HERO CARD */}
          {standing && (
            <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#172554] text-white border border-indigo-500/30 shadow-xl shadow-indigo-950/30">
              <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-blue-500/10 via-indigo-500/10 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 fill-amber-300" />
                      Your Standing: Rank #{standing.rank} of {standing.totalStudents}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Top {100 - standing.percentile < 1 ? '1%' : `${(100 - standing.percentile).toFixed(1)}%`} in Class
                    </span>
                  </div>

                  <h3 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-3">
                    <span>{standing.score}</span>
                    <span className="text-sm font-semibold text-indigo-300">
                      / 100 {calculationType === 'composite' ? 'Hybrid Score' : calculationType === 'assessments' ? 'Exam Marks %' : 'Practice Points'}
                    </span>
                  </h3>

                  <p className="text-xs text-indigo-200/80 max-w-xl">
                    {standing.gapToNext > 0
                      ? `You are only ${standing.gapToNext} points away from overtaking Rank #${standing.rank - 1}! Solve adaptive practice sessions and excel in upcoming faculty quizzes to advance.`
                      : 'Outstanding achievement! You hold the top standing in your class cohort. Keep practicing to maintain your edge.'}
                  </p>
                </div>

                {/* Score Breakdown Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
                  <div className="text-center p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/70">
                      Assessment Marks
                    </p>
                    <p className="text-lg font-black text-amber-300 mt-0.5">{standing.assessmentScore}%</p>
                    <span className="text-[10px] text-indigo-300">70% Weight</span>
                  </div>

                  <div className="text-center p-2 border-l border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/70">
                      Practice Mastery
                    </p>
                    <p className="text-lg font-black text-blue-300 mt-0.5">{standing.practiceScore}%</p>
                    <span className="text-[10px] text-indigo-300">30% Weight</span>
                  </div>

                  <div className="text-center p-2 border-l border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/70">
                      Accuracy
                    </p>
                    <p className="text-lg font-black text-emerald-300 mt-0.5">{standing.accuracy}%</p>
                    <span className="text-[10px] text-indigo-300">{standing.questionsCount} Solved</span>
                  </div>

                  <div className="text-center p-2 border-l border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/70">
                      Active Streak
                    </p>
                    <p className="text-lg font-black text-rose-300 mt-0.5 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 fill-rose-400" />
                      {standing.streakDays}d
                    </p>
                    <span className="text-[10px] text-indigo-300">Daily Goal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FILTER CONTROLS BAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            {/* 3 Core Calculation Mode Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                <button
                  onClick={() => {
                    setCalculationType('composite');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    calculationType === 'composite'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    calculationType === 'assessments'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    calculationType === 'practice'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Adaptive Practice Only</span>
                </button>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{metaInfo?.calculationFormula || 'Calculating percentile distribution'}</span>
              </div>
            </div>

            {/* Subject Dropdown & Division & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Subject Selector */}
                <div className="relative min-w-[240px]">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                    className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="CE-A">Division CE-A</option>
                    <option value="CE-B">Division CE-B</option>
                  </select>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search student or ID..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* TOP 3 PODIUM */}
          {podium.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6 pb-2">
              {/* 2nd Place (Silver) */}
              <div className="order-2 md:order-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center relative shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 shadow-md">
                  2
                </div>
                <div className="pt-3 space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                    {podium[1].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {podium[1].name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {podium[1].enrollmentNumber} • {podium[1].division}
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                    {podium[1].score} pts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[1].assessmentScore}%</span>
                    <span>Practice: {podium[1].practiceScore}%</span>
                  </div>
                </div>
              </div>

              {/* 1st Place (Gold / Champion) */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900 rounded-3xl border-2 border-amber-400 dark:border-amber-500/60 p-7 text-center relative shadow-xl shadow-amber-500/10 -translate-y-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
                  <Crown className="w-6 h-6 fill-white" />
                </div>
                <div className="pt-4 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Cohort Champion
                  </span>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 ring-4 ring-amber-100 dark:ring-amber-950">
                    {podium[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">
                      {podium[0].name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {podium[0].enrollmentNumber} • {podium[0].division}
                    </p>
                  </div>
                  <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs font-black shadow-md shadow-amber-500/30">
                    {podium[0].score} pts
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[0].assessmentScore}%</span>
                    <span>Practice: {podium[0].practiceScore}%</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place (Bronze) */}
              <div className="order-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center relative shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-amber-700/20 text-amber-700 border-2 border-amber-700/40 flex items-center justify-center font-black shadow-md">
                  3
                </div>
                <div className="pt-3 space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                    {podium[2].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {podium[2].name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {podium[2].enrollmentNumber} • {podium[2].division}
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-xs font-black text-amber-800 dark:text-amber-300">
                    {podium[2].score} pts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-center gap-3 pt-1">
                    <span>Exam: {podium[2].assessmentScore}%</span>
                    <span>Practice: {podium[2].practiceScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FULL CLASS RANKINGS TABLE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Full Semester Roster Standings ({filteredRankings.length} Students)</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by {calculationType === 'composite' ? 'Hybrid Score' : calculationType === 'assessments' ? 'Faculty Marks' : 'Practice Mastery'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRankings.map((student) => {
                    const isMe = student.isCurrentUser;
                    return (
                      <tr
                        key={student.studentId}
                        className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          isMe
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 font-medium'
                            : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">{getRankBadge(student.rank)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                                isMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {student.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {isMe && (
                                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {student.enrollmentNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                          <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                            {student.score}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {student.assessmentScore}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {student.assessmentsCount} tests
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {student.practiceScore}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {student.questionsCount} Qs ({student.accuracy}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {student.badges.map((b, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages} ({filteredRankings.length} students)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40"
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
