'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Briefcase,
  Target,
  Award,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Code,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Benchmark {
  id: string;
  roleType: string;
  title: string;
  description: string;
  targetMastery: number;
  salaryRange?: string;
  hiringPartners?: string;
  requiredSkills: string;
}

interface SkillGap {
  skill: string;
  studentMastery: number;
  requiredMastery: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface GapAnalysis {
  roleType: string;
  roleTitle: string;
  readinessScore: number;
  hiringBarStatus: 'MEETS_BAR' | 'NEAR_BAR' | 'DEVELOPING';
  verifiedSkills: Array<{ skill: string; mastery: number; required: number }>;
  skillGaps: SkillGap[];
  mockTestsTaken: number;
  avgMockScore: number;
  personalizedRoadmap: string[];
}

interface MockExam {
  id: string;
  roleType: string;
  companyProfile: string;
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
  difficulty: string;
}

export default function StudentPlacementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isPinned } = useSidebar();

  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('SDE');
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingRole, setUpdatingRole] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchPlacementData();
    }
  }, [user, authLoading]);

  const fetchPlacementData = async (roleToFetch?: string) => {
    setLoading(true);
    try {
      const role = roleToFetch || selectedRole;
      const [benchmarksRes, analysisRes, mocksRes] = await Promise.all([
        api.get('/placement/benchmarks'),
        api.get(`/placement/student/gap-analysis?roleType=${role}`),
        api.get(`/placement/mock-exams?roleType=${role}`),
      ]);

      setBenchmarks(benchmarksRes || []);
      setAnalysis(analysisRes);
      setMockExams(mocksRes || []);
      if (analysisRes?.roleType) {
        setSelectedRole(analysisRes.roleType);
      }
    } catch (err: any) {
      console.error('Failed to load placement readiness telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    setSelectedRole(newRole);
    setUpdatingRole(true);
    setStatusMessage(null);
    try {
      await api.post('/placement/student/target-role', { targetRole: newRole });
      await fetchPlacementData(newRole);
      setStatusMessage(`Target benchmark updated to ${newRole}`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to update target role:', err);
    } finally {
      setUpdatingRole(false);
    }
  };

  const activeBenchmark = benchmarks.find((b) => b.roleType === selectedRole) || benchmarks[0];

  return (
    <div className="flex bg-[#F8FAFC] dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 p-8 shadow-xs dark:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Career & Placement Intelligence
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Live Industry Bar
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Placement Readiness & Skill Gap Analyzer
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                  Real-time cognitive benchmarking comparing your syllabus mastery against Tier-1 campus hiring bars.
                  Identify critical skill deltas and follow personalized learning roadmaps.
                </p>
              </div>

              {/* Role Selector */}
              <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col gap-2 min-w-[260px]">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Target Career Role
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {benchmarks.map((r) => {
                    const labelMap: Record<string, string> = {
                      SDE: 'SDE Core',
                      DATA_ANALYST: 'Data Analyst',
                      ML_ENGINEER: 'ML Engineer',
                      GATE_CS: 'GATE CS',
                      CYBERSECURITY_ANALYST: 'Cybersecurity',
                      CLOUD_DEVOPS: 'Cloud & DevOps',
                    };
                    const label = labelMap[r.roleType] || r.roleType.replace('_', ' ');
                    return (
                      <button
                        key={r.roleType}
                        onClick={() => handleRoleChange(r.roleType)}
                        disabled={updatingRole}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedRole === r.roleType
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="mt-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {statusMessage}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm font-medium">Computing cognitive placement gap analysis...</p>
            </div>
          ) : (
            <>
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Readiness Score Card */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Placement Readiness</span>
                    <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="my-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {analysis?.readinessScore ?? 0}%
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ 100%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(analysis?.readinessScore ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        analysis?.hiringBarStatus === 'MEETS_BAR'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                          : analysis?.hiringBarStatus === 'NEAR_BAR'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                          : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      {analysis?.hiringBarStatus?.replace('_', ' ') ?? 'DEVELOPING'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Industry Hire Bar</span>
                  </div>
                </div>

                {/* Role Benchmark Target Card */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role Benchmark</span>
                    <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="my-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {activeBenchmark?.title || 'Software Development Engineer'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {activeBenchmark?.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-indigo-600 dark:text-indigo-300 font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Target Mastery: {activeBenchmark?.targetMastery || 80.0}%
                  </div>
                </div>

                {/* Compensation & Partners */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Benchmark Package</span>
                    <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {activeBenchmark?.salaryRange || 'Competitive Industry Norm'}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tier-1 & Campus Placement Norms</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                    Partners: {activeBenchmark?.hiringPartners || 'Tier-1 Recruiters'}
                  </div>
                </div>

                {/* Mock Test Telemetry */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mock Assessment</span>
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="my-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        {analysis?.mockTestsTaken ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Tests Completed</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Score: {analysis?.avgMockScore ?? 0}%</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    AI Proctoring Audit Active
                  </div>
                </div>
              </div>

              {/* Skill Gap Matrix & Radar Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Detailed Gap Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Skill Gap Matrix & Required Thresholds
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Continuous telemetry based on syllabus tests, homework quizzes, and proctored coding assessments.
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                      {analysis?.skillGaps.length ?? 0} Gap(s) Identified
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-3">Core Competency</th>
                          <th className="py-3 px-3">Your Mastery</th>
                          <th className="py-3 px-3">Industry Bar</th>
                          <th className="py-3 px-3">Delta Gap</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {analysis?.skillGaps.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-3 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                              <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              {item.skill}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{item.studentMastery}%</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">{item.requiredMastery}%</td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`font-extrabold ${
                                  item.gap > 20
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : item.gap > 10
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                -{item.gap}%
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.priority === 'HIGH'
                                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                                    : item.priority === 'MEDIUM'
                                    ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                                    : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                                }`}
                              >
                                {item.priority === 'HIGH' ? 'Critical Gap' : 'Needs Practice'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <Link
                                href="/student/practice"
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs"
                              >
                                Bridge Gap
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}

                        {analysis?.verifiedSkills.map((item, idx) => (
                          <tr key={`v-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-emerald-50/50 dark:bg-emerald-950/10">
                            <td className="py-3.5 px-3 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              {item.skill}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.mastery}%</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">{item.required}%</td>
                            <td className="py-3.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">Passed</td>
                            <td className="py-3.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                Verified
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Hiring Ready</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Personalized Remedial Roadmap */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Bridge Learning Roadmap
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Algorithmic milestones generated to reach the hiring bar within 4 weeks.
                    </p>

                    <div className="mt-6 space-y-4">
                      {analysis?.personalizedRoadmap.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-gradient-to-tr dark:from-indigo-950/80 dark:to-purple-950/50 border border-indigo-200 dark:border-indigo-500/30 text-xs">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-1">
                      Campus Placement Eligibility: {activeBenchmark?.targetMastery || 80}% Threshold
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Maintaining ≥{activeBenchmark?.targetMastery || 80}% overall readiness qualifies your profile for prioritized campus placement interviews with {activeBenchmark?.hiringPartners || 'Tier-1 hiring partners'}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Placement Mock Exams Section */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs dark:shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Industry-Standard Placement Mock Assessments
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Timed technical screening assessments equipped with AI Proctoring and code execution telemetry.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mockExams.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
                      No mock exams currently scheduled for this role benchmark.
                    </div>
                  ) : (
                    mockExams.map((mock) => (
                      <div
                        key={mock.id}
                        className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                              {mock.companyProfile}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {mock.durationMinutes} mins
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            {mock.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{mock.description}</p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {mock.totalQuestions} Questions | {mock.passingScore}% Pass
                          </span>
                          <Link
                            href="/student/assessments"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all"
                          >
                            Start Mock
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
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
