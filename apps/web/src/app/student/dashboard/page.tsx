'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { LearningCurveChart } from '@/components/LearningCurveChart';
import { TopicMasteryCard } from '@/components/TopicMasteryCard';
import { Phase2IntelligencePanel } from '@/components/Phase2IntelligencePanel';
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
  Award,
  Layers,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Initial baseline for fresh student: all metrics start at zero until activity is performed
  const [summary, setSummary] = useState<any>({
    overallMastery: 0,
    questionsPracticed: 0,
    accuracy: 0,
    streakDays: 0,
    testsAttempted: 0,
    weakTopics: [],
    strongTopics: [],
    topicMasteries: [],
    learningCurve: [],
    recentActivity: [],
    cognitiveAdvice: null,
  });

  const [loading, setLoading] = useState(false);
  const [remediationNudge, setRemediationNudge] = useState<any>(null);
  const [assignedAssessments, setAssignedAssessments] = useState<any[]>([]);

  // Knowledge Curve filter state (Default: Overall Learning Curve + All Topics)
  const [kcSource, setKcSource] = useState<string>('ALL');
  const [kcTopic, setKcTopic] = useState<string>('ALL');
  const [kcCurveData, setKcCurveData] = useState<any[]>([]);
  const [kcLoading, setKcLoading] = useState<boolean>(false);

  // Restore saved filter selection from localStorage across refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSource = localStorage.getItem('adaptiq_kc_source');
      const savedTopic = localStorage.getItem('adaptiq_kc_topic');
      if (savedSource && ['ALL', 'PRACTICE', 'ASSESSMENT'].includes(savedSource)) {
        setKcSource(savedSource);
      }
      if (savedTopic) {
        setKcTopic(savedTopic);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const fetchFilteredCurve = async (source: string, topicId: string) => {
    setKcLoading(true);
    try {
      const q = new URLSearchParams();
      if (source && source !== 'ALL') q.set('source', source);
      if (topicId && topicId !== 'ALL') q.set('topicId', topicId);
      const queryStr = q.toString() ? `?${q.toString()}` : '';

      const curve: any = await api.get(`/analytics/student/me/learning-curve${queryStr}`);
      if (Array.isArray(curve)) {
        setKcCurveData(curve);
      }
    } catch (err) {
      console.error('Failed to load filtered knowledge curve:', err);
    } finally {
      setKcLoading(false);
    }
  };

  const handleSourceChange = (newSource: string) => {
    setKcSource(newSource);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adaptiq_kc_source', newSource);
    }
    fetchFilteredCurve(newSource, kcTopic);
  };

  const handleTopicChange = (newTopic: string) => {
    setKcTopic(newTopic);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adaptiq_kc_topic', newTopic);
    }
    fetchFilteredCurve(kcSource, newTopic);
  };

  const availableTopics = useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

    const addTopic = (id: string, name: string, code?: string) => {
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({ id, name: code ? `${code} - ${name}` : name });
      }
    };

    if (Array.isArray(summary?.topicMasteries)) {
      summary.topicMasteries.forEach((m: any) => addTopic(m.topicId, m.topicName, m.courseCode));
    }
    if (Array.isArray(summary?.weakTopics)) {
      summary.weakTopics.forEach((m: any) => addTopic(m.topicId, m.topicName, m.courseCode));
    }
    if (Array.isArray(summary?.strongTopics)) {
      summary.strongTopics.forEach((m: any) => addTopic(m.topicId, m.topicName, m.courseCode));
    }
    return list;
  }, [summary?.topicMasteries, summary?.weakTopics, summary?.strongTopics]);

  const loadDashboardData = async () => {
    try {
      const data: any = await api.get('/analytics/student/me/summary');
      if (data && typeof data === 'object') {
        const curveArray = Array.isArray(data.learningCurve) ? data.learningCurve : [];
        setSummary({
          overallMastery: typeof data.overallMastery === 'number' ? data.overallMastery : 0,
          questionsPracticed: typeof data.questionsPracticed === 'number' ? data.questionsPracticed : 0,
          accuracy: typeof data.accuracy === 'number' ? data.accuracy : 0,
          testsAttempted: typeof data.testsAttempted === 'number' ? data.testsAttempted : 0,
          streakDays: typeof data.streakDays === 'number' ? data.streakDays : 0,
          learningCurve: curveArray,
          topicMasteries: Array.isArray(data.topicMasteries) ? data.topicMasteries : [],
          weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
          strongTopics: Array.isArray(data.strongTopics) ? data.strongTopics : [],
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
          cognitiveAdvice: data.cognitiveAdvice || null,
        });

        // Initialize curve with default or saved filter
        const savedSource = typeof window !== 'undefined' ? localStorage.getItem('adaptiq_kc_source') : null;
        const savedTopic = typeof window !== 'undefined' ? localStorage.getItem('adaptiq_kc_topic') : null;
        if ((!savedSource || savedSource === 'ALL') && (!savedTopic || savedTopic === 'ALL')) {
          setKcCurveData(curveArray);
        } else {
          fetchFilteredCurve(savedSource || 'ALL', savedTopic || 'ALL');
        }
      }
    } catch {
      // Keep real zero state
    }

    try {
      const notifs: any = await api.get('/disputes/notifications');
      const activeNudge =
        notifs?.find((n: any) => n.type === 'REMEDIATION_NUDGE' && !n.read) ||
        notifs?.find((n: any) => n.type === 'REMEDIATION_NUDGE');
      if (activeNudge) {
        let meta = {};
        try {
          meta = JSON.parse(activeNudge.metadata || '{}');
        } catch {}
        setRemediationNudge({ ...activeNudge, meta });
      }
    } catch {
      // silent
    }

    try {
      const assessData: any = await api.get('/assessments/student');
      if (Array.isArray(assessData)) {
        const pending = assessData.filter((a: any) => a.hasAvailableAttempts);
        setAssignedAssessments(pending);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Learning Intelligence Dashboard"
          subtitle={`Knowledge Profile for ${user?.name || user?.email || 'Student'}`}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Quick Practice Banner */}
          <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border border-indigo-500/20">
            <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-blue-500/20 to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-extrabold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>
                  {remediationNudge ? '🎯 Faculty-Assigned Remediation' : 'Next Recommended Adaptive Session'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white">
                {remediationNudge
                  ? `Strengthen ${remediationNudge.meta?.topicName || 'Assigned Topic'}`
                  : summary?.weakTopics && summary.weakTopics.length > 0
                  ? `Strengthen ${summary.weakTopics[0].topicName}`
                  : summary?.questionsPracticed > 0
                  ? 'Continue Adaptive Mastery'
                  : 'Begin Your Adaptive Learning Journey'}
              </h2>
              <p className="text-xs md:text-sm text-indigo-200 mt-2 leading-relaxed">
                {remediationNudge
                  ? `${remediationNudge.meta?.facultyName || 'Your course instructor'} has dispatched an automated remediation practice session for ${remediationNudge.meta?.topicName || 'this topic'} (${remediationNudge.meta?.courseCode || 'Course'}). Complete this session to reinforce core invariants and elevate your mastery score.`
                  : summary?.weakTopics && summary.weakTopics.length > 0
                  ? `Your current mastery in ${summary.weakTopics[0].topicName} is ${summary.weakTopics[0].masteryScore}%. Completing targeted practice questions will reinforce key concepts.`
                  : summary?.questionsPracticed > 0
                  ? `You have practiced ${summary.questionsPracticed} questions with ${summary.accuracy}% accuracy. Keep practicing to elevate topic proficiency.`
                  : 'Start practicing to diagnose your current mastery levels and generate your real-time knowledge curve.'}
              </p>
            </div>

            <Link
              href={remediationNudge?.meta?.actionUrl || '/student/practice'}
              prefetch={false}
              className="relative z-10 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-indigo-950 font-black text-xs shadow-xl hover:bg-blue-50 transition transform hover:-translate-y-0.5 shrink-0"
            >
              <BrainCircuit className="w-4 h-4 text-blue-600" />
              <span>
                {remediationNudge
                  ? 'Start Assigned Remediation Practice'
                  : summary?.questionsPracticed > 0
                  ? 'Continue Practice'
                  : 'Start Adaptive Practice'}
              </span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </Link>
          </div>

          {/* Assigned Course Assessments Alert */}
          {assignedAssessments.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Official Course Assessment Assigned ({assignedAssessments.length} Available)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Active Evaluation
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Assigned for your division: <strong className="font-semibold text-slate-800 dark:text-slate-200">{assignedAssessments[0].title}</strong> ({assignedAssessments[0].courseCode}) • {assignedAssessments[0].durationMinutes}m • {assignedAssessments[0].totalQuestions} Questions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/student/assessments"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
                  >
                    <span>View & Start Exam</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Key Metric Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Core Academic Telemetry
              </h3>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Real-Time Continuous EWMA
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Overall Mastery"
                value={`${summary?.overallMastery ?? 0}%`}
                subtitle="Knowledge Tracing Score"
                icon={BrainCircuit}
                trend={
                  summary?.overallMastery > 0
                    ? { value: `${summary.overallMastery}% achieved`, isPositive: true }
                    : undefined
                }
                color="indigo"
              />
              <MetricCard
                title="Questions Practiced"
                value={summary?.questionsPracticed ?? 0}
                subtitle="Total Attempts Logged"
                icon={Target}
                color="blue"
              />
              <MetricCard
                title="Accuracy Rate"
                value={`${summary?.accuracy ?? 0}%`}
                subtitle="First-Attempt Precision"
                icon={CheckCircle2}
                color="emerald"
              />
              <MetricCard
                title="Active Streak"
                value={`${summary?.streakDays ?? 0} Days`}
                subtitle="Daily Learning Rhythm"
                icon={Flame}
                color="amber"
              />
              <MetricCard
                title="Tests Completed"
                value={summary?.testsAttempted ?? 0}
                subtitle="Official Assessments"
                icon={Award}
                color="purple"
              />
            </div>
          </div>

          {/* Two-Column: Learning Curve & Weak/Strong Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Learning Curve Progression */}
            <div id="curve" className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Knowledge Curve Progression
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Longitudinal mastery trajectory with rolling calibration &amp; balanced assessment fusion
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Source Filter */}
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      id="kc-filter-overall"
                      onClick={() => handleSourceChange('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        kcSource === 'ALL'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Overall Curve
                    </button>
                    <button
                      type="button"
                      id="kc-filter-practice"
                      onClick={() => handleSourceChange('PRACTICE')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        kcSource === 'PRACTICE'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Adaptive Practice
                    </button>
                    <button
                      type="button"
                      id="kc-filter-assessments"
                      onClick={() => handleSourceChange('ASSESSMENT')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        kcSource === 'ASSESSMENT'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Assessments
                    </button>
                  </div>

                  {/* Topic Filter */}
                  <select
                    id="kc-filter-topic"
                    value={kcTopic}
                    onChange={(e) => handleTopicChange(e.target.value)}
                    aria-label="Filter by Topic"
                    className="p-1.5 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Topics</option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <LearningCurveChart
                data={kcCurveData}
                sourceFilter={kcSource}
                topicFilter={kcTopic}
                isLoading={kcLoading}
              />
            </div>

            {/* Strengths & Weaknesses Triage */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-rose-500" />
                  Conceptual Focus Areas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Topics automatically classified by knowledge depth (&lt;70% focus vs &ge;70% mastered)
                </p>

                {/* Priority Weak Topics */}
                <div className="mb-5">
                  <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Immediate Practice:
                  </span>
                  <div className="space-y-2">
                    {summary?.weakTopics && summary.weakTopics.length > 0 ? (
                      summary.weakTopics.map((wt: any) => (
                        <Link
                          key={wt.topicId}
                          href={`/student/practice?topicId=${wt.topicId}`}
                          className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition group cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition flex items-center gap-1.5">
                              {wt.topicName}
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {wt.courseCode} • {wt.attemptCount || 0} attempts
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                              {wt.masteryScore}%
                            </span>
                            <span className="block text-[9px] text-rose-500 font-semibold">
                              Target 70%
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : summary?.questionsPracticed > 0 ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                        🎉 All practiced topics have reached mastery (&ge;70%)! Select any topic in the curriculum to level up.
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No weak topics identified yet. Start practicing to calibrate.</p>
                    )}
                  </div>
                </div>

                {/* Mastered Concepts */}
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mastered Concepts (&ge;70%):
                  </span>
                  <div className="space-y-2">
                    {summary?.strongTopics && summary.strongTopics.length > 0 ? (
                      summary.strongTopics.map((st: any) => (
                        <div
                          key={st.topicId}
                          className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{st.topicName}</p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {st.courseCode} • {st.accuracy}% accuracy
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{st.masteryScore}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Complete practice and achieve 70%+ score to promote topics here.</p>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href="/student/practice"
                prefetch={false}
                className="w-full py-2.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition border border-blue-200 dark:border-blue-800"
              >
                Target Weak Areas Now →
              </Link>
            </div>
          </div>

          {/* Cognitive Intelligence Advice Banner */}
          {summary?.cognitiveAdvice && (
            <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl shadow-indigo-950/10 border border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold shadow-md">
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black tracking-tight text-white uppercase">
                          Cognitive Intelligence Advice
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/20 text-indigo-200">
                          {summary.cognitiveAdvice.focusType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-indigo-300 mt-0.5">
                        {summary.cognitiveAdvice.headline}
                      </p>
                    </div>
                  </div>

                  {summary.cognitiveAdvice.targetTopicId && (
                    <Link
                      href={`/student/practice?topicId=${summary.cognitiveAdvice.targetTopicId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition shadow-lg shrink-0"
                    >
                      <span>Practice {summary.cognitiveAdvice.targetTopicName}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed mb-4 max-w-4xl">
                  {summary.cognitiveAdvice.advice}
                </p>

                {summary.cognitiveAdvice.actionItems && summary.cognitiveAdvice.actionItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-indigo-500/20">
                    {summary.cognitiveAdvice.actionItems.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-indigo-200">
                        <span className="w-4 h-4 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Bayesian Knowledge Tracing, Forgetting Curves & Prerequisite DAG */}
          <Phase2IntelligencePanel />

          {/* Detailed Topic Mastery Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Detailed Topic Mastery Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time knowledge states across curriculum subjects
                </p>
              </div>

              <Link
                href="/student/practice"
                prefetch={false}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
                    decayedMastery={tm.decayedMastery}
                    retentionStatus={tm.retentionStatus}
                    attemptCount={tm.attemptCount}
                    onPracticeClick={() => router.push(`/student/practice?topicId=${tm.topicId}`)}
                  />
                ))
              ) : (
                <p className="text-xs text-slate-400">No topic mastery records found.</p>
              )}
            </div>
          </div>

          {/* Recent Practice History */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Recent Practice Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed timeline of recent question attempts and accuracy
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                summary.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          act.isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {act.isCorrect ? '✓' : '✕'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{act.topicName}</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {act.courseCode} • {act.difficulty} difficulty • {act.timeTakenSeconds}s
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
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
