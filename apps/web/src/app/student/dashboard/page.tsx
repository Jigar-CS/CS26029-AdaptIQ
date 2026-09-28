'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { LearningCurveChart } from '@/components/LearningCurveChart';
import { TopicMasteryCard } from '@/components/TopicMasteryCard';
import {
  BrainCircuit,
  TrendingUp,
  Target,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/analytics/student/me/summary');
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard intelligence metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Synthesizing learning profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Role-aware Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Learning Intelligence"
          subtitle={`Knowledge Profile for ${user?.name || user?.email}`}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Quick Practice Banner */}
          <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Next Recommended Session</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-tight">
                Strengthen Dynamic Programming & Graphs
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                Your current mastery in DP is 31%. 3 targeted practice questions will reinforce optimal substructure concepts.
              </p>
            </div>

            <Link
              href="/student/practice"
              className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-950 font-extrabold text-xs shadow-lg hover:bg-indigo-50 transition transform hover:-translate-y-0.5 shrink-0"
            >
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              <span>Start Adaptive Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Overall Mastery"
              value={`${summary?.overallMastery || 0}%`}
              subtitle="EWMA Knowledge Score"
              icon={BrainCircuit}
              trend={{ value: '14% this week', isPositive: true }}
              color="indigo"
            />
            <MetricCard
              title="Questions Practiced"
              value={summary?.questionsPracticed || 0}
              subtitle="Total Attempts Logged"
              icon={Target}
              color="blue"
            />
            <MetricCard
              title="Accuracy Rate"
              value={`${summary?.accuracy || 0}%`}
              subtitle="First-Attempt Precision"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="Active Streak"
              value={`${summary?.streakDays || 7} Days`}
              subtitle="Daily Learning Rhythm"
              icon={Flame}
              color="amber"
            />
            <MetricCard
              title="Tests Attempted"
              value={summary?.testsAttempted || 0}
              subtitle="Official Assessments"
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* Two-Column Grid: Learning Curve & Weak Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Learning Curve Chart */}
            <div id="curve" className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Knowledge Curve Progression
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real historical mastery milestones across practice attempts over time
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  DSA CS301
                </span>
              </div>

              <LearningCurveChart data={summary?.learningCurve || []} />
            </div>

            {/* Strengths & Weaknesses Triage */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-rose-500" />
                  Conceptual Focus Areas
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Topics automatically classified by knowledge depth
                </p>

                {/* Weak Topics */}
                <div className="mb-5">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Immediate Practice:
                  </span>
                  <div className="space-y-2">
                    {summary?.weakTopics && summary.weakTopics.length > 0 ? (
                      summary.weakTopics.map((wt: any) => (
                        <div
                          key={wt.topicId}
                          className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{wt.topicName}</p>
                            <span className="text-[10px] text-slate-500">{wt.courseCode}</span>
                          </div>
                          <span className="text-xs font-extrabold text-rose-600">{wt.masteryScore}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No weak topics identified yet.</p>
                    )}
                  </div>
                </div>

                {/* Strong Topics */}
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mastered Concepts:
                  </span>
                  <div className="space-y-2">
                    {summary?.strongTopics && summary.strongTopics.length > 0 ? (
                      summary.strongTopics.map((st: any) => (
                        <div
                          key={st.topicId}
                          className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{st.topicName}</p>
                            <span className="text-[10px] text-slate-500">{st.courseCode}</span>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-700">{st.masteryScore}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Practice more to establish strong concepts.</p>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href="/student/practice"
                className="mt-6 w-full py-2.5 text-center text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                Target Weak Areas Now →
              </Link>
            </div>
          </div>

          {/* Topic Mastery Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Detailed Topic Mastery Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time knowledge states across curriculum subjects
                </p>
              </div>

              <Link
                href="/student/practice"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Practice All →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {summary?.topicMasteries && summary.topicMasteries.length > 0 ? (
                summary.topicMasteries.map((tm: any) => (
                  <TopicMasteryCard
                    key={tm.topicId}
                    topicName={tm.topicName}
                    courseCode={tm.courseCode}
                    masteryScore={tm.masteryScore}
                    attemptCount={tm.attemptCount}
                    onPracticeClick={() => router.push(`/student/practice?topicId=${tm.topicId}`)}
                  />
                ))
              ) : (
                <p className="text-xs text-slate-400">No topic mastery records found.</p>
              )}
            </div>
          </div>

          {/* Recent Practice History Timeline */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Recent Practice Activity
                </h3>
                <p className="text-xs text-slate-500">Detailed timeline of recent question attempts</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                summary.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          act.isCorrect
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {act.isCorrect ? '✓' : '✕'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{act.topicName}</p>
                        <span className="text-[10px] text-slate-400">
                          {act.courseCode} • {act.difficulty} difficulty • {act.timeTakenSeconds}s
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4">No recent attempts logged.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
