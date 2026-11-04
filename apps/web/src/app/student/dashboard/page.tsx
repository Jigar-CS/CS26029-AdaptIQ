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
  Award,
  Layers,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useRealtimeGreeting } from '@/lib/greeting';

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const greeting = useRealtimeGreeting();

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
      const savedSource = localStorage.getItem('clias_kc_source');
      const savedTopic = localStorage.getItem('clias_kc_topic');
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
      localStorage.setItem('clias_kc_source', newSource);
    }
    fetchFilteredCurve(newSource, kcTopic);
  };

  const handleTopicChange = (newTopic: string) => {
    setKcTopic(newTopic);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clias_kc_topic', newTopic);
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

  const displayTopics = useMemo(() => {
    if (summary?.topicMasteries && summary.topicMasteries.length > 0) {
      return summary.topicMasteries.slice(0, 4).map((tm: any) => ({
        name: tm.topicName,
        percent: Math.round(tm.masteryScore),
        status:
          tm.masteryScore >= 80
            ? 'STRONG'
            : tm.masteryScore >= 70
              ? 'STABLE'
              : tm.masteryScore >= 55
                ? 'REVIEW'
                : 'PRIORITY',
      }));
    }
    return [];
  }, [summary?.topicMasteries]);

  const skillMatrixRows = useMemo(() => {
    if (!summary?.topicMasteries || summary.topicMasteries.length === 0) return [];
    return summary.topicMasteries.slice(0, 4).map((tm: any) => {
      const concept = Math.round(tm.masteryScore);
      const app = Math.min(100, Math.round(tm.accuracy ?? tm.masteryScore * 0.9));
      const problemSolving = Math.min(100, Math.max(0, Math.round(tm.masteryScore * 0.85 + (tm.attemptCount > 5 ? 8 : 0))));
      return {
        name: (tm.courseCode || tm.topicName.slice(0, 6)).toUpperCase(),
        scores: [concept, app, problemSolving],
      };
    });
  }, [summary?.topicMasteries]);

  const recommendations = useMemo(() => {
    if (summary?.weakTopics && summary.weakTopics.length > 0) {
      return summary.weakTopics.slice(0, 3).map((wt: any) => [
        `Review ${wt.topicName}`,
        `${wt.courseCode || 'CORE'} / TARGET 70%`,
        wt.topicId,
        `/student/practice?topicId=${wt.topicId}`,
      ]);
    }
    if (assignedAssessments && assignedAssessments.length > 0) {
      return assignedAssessments.slice(0, 3).map((a: any) => [
        `Attempt ${a.title}`,
        `${a.courseCode} / ${a.durationMinutes} MIN`,
        '',
        '/student/assessments',
      ]);
    }
    return [
      ['Take Initial Diagnostic Drill', 'CALIBRATE MASTERY PROFILE', '', '/student/practice'],
      ['Browse Enrolled Courses', 'CURRICULUM TOPICS & SYLLABUS', '', '/student/courses'],
      ['Explore Coding Lab', 'HANDS-ON ALGORITHMIC CHALLENGES', '', '/student/coding'],
    ];
  }, [summary?.weakTopics, assignedAssessments]);

  const loadDashboardData = async () => {
    try {
      const [summaryRes, notifsRes, assessRes] = await Promise.allSettled([
        api.get('/analytics/student/me/summary'),
        api.get('/disputes/notifications'),
        api.get('/assessments/student'),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value && typeof summaryRes.value === 'object') {
        const data: any = summaryRes.value;
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
        const savedSource = typeof window !== 'undefined' ? localStorage.getItem('clias_kc_source') : null;
        const savedTopic = typeof window !== 'undefined' ? localStorage.getItem('clias_kc_topic') : null;
        if ((!savedSource || savedSource === 'ALL') && (!savedTopic || savedTopic === 'ALL')) {
          setKcCurveData(curveArray);
        } else {
          fetchFilteredCurve(savedSource || 'ALL', savedTopic || 'ALL');
        }
      }

      if (notifsRes.status === 'fulfilled') {
        const notifs: any = notifsRes.value;
        const activeNudge =
          notifs?.find((n: any) => n.type === 'REMEDIATION_NUDGE' && !n.read) ||
          notifs?.find((n: any) => n.type === 'REMEDIATION_NUDGE');
        if (activeNudge) {
          let meta = {};
          try {
            meta = JSON.parse(activeNudge.metadata || '{}');
          } catch { }
          setRemediationNudge({ ...activeNudge, meta });
        }
      }

      if (assessRes.status === 'fulfilled' && Array.isArray(assessRes.value)) {
        const pending = assessRes.value.filter((a: any) => a.hasAvailableAttempts);
        setAssignedAssessments(pending);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Student Learning Intelligence Dashboard"
          subtitle={`Knowledge Profile for ${user?.name || user?.email || 'Student'}`}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Exact Gleam-Spark Page Intro Banner */}
          <div className="page-intro">
            <div>
              <h1 className="page-title display" suppressHydrationWarning>
                {greeting},<span className="coral">{(user?.name || user?.email?.split('@')[0] || 'AARAV').toUpperCase().split(' ')[0]}.</span>
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-xs font-semibold uppercase">LEARNING READINESS</p>
              <strong>
                {summary && (summary.overallMastery > 0 || summary.accuracy > 0)
                  ? Math.min(100, Math.round((summary.overallMastery || 0) * 0.85 + (summary.accuracy || 0) * 0.15))
                  : 0}
                <span>%</span>
              </strong>
              <p className="mono blue text-xs font-semibold uppercase">
                {(summary?.overallMastery ?? 0) >= 75
                  ? 'READY FOR ADVANCED DRILL'
                  : (summary?.overallMastery ?? 0) >= 50
                    ? 'STABLE FOUNDATION'
                    : (summary?.questionsPracticed ?? 0) > 0
                      ? 'DEVELOPING FOUNDATION'
                      : 'NEW LEARNER • NO SESSIONS YET'}
              </p>
            </div>
          </div>

          {/* Exact Gleam-Spark 4-Column Metrics Bar */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono">
                <span>01</span>
                <span>{summary?.overallMastery > 0 ? `+${(summary.overallMastery * 0.05).toFixed(1)}%` : '0.0%'}</span>
              </div>
              <div className="metric-value">
                {summary?.overallMastery != null ? `${summary.overallMastery}%` : '0%'}
              </div>
              <div className="metric-label mono">LEARNING MASTERY</div>
            </div>
            <div className="metric">
              <div className="metric-top mono">
                <span>02</span>
                <span>{summary?.accuracy > 0 ? `+${(summary.accuracy * 0.03).toFixed(1)}%` : '0.0%'}</span>
              </div>
              <div className="metric-value">
                {summary?.accuracy != null ? `${summary.accuracy}%` : '0%'}
              </div>
              <div className="metric-label mono">ASSESSMENT ACCURACY</div>
            </div>
            <div className="metric">
              <div className="metric-top mono">
                <span>03</span>
                <span>+{summary?.questionsPracticed ?? 0}</span>
              </div>
              <div className="metric-value">
                {(summary?.questionsPracticed ?? 0).toLocaleString()}
              </div>
              <div className="metric-label mono">QUESTIONS PRACTICED</div>
            </div>
            <div className="metric">
              <div className="metric-top mono">
                <span>04</span>
                <span>BEST {summary?.streakDays ?? 0}</span>
              </div>
              <div className="metric-value">
                {summary?.streakDays ?? 0} DAYS
              </div>
              <div className="metric-label mono">CURRENT STREAK</div>
            </div>
          </div>

          {/* Exact Gleam-Spark Priority Band Banner */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
             
              <h2 className="display">
                {remediationNudge
                  ? `REINFORCE ${(remediationNudge.meta?.topicName || 'ASSIGNED TOPIC').toUpperCase()}`
                  : summary?.weakTopics && summary.weakTopics.length > 0
                    ? `REINFORCE ${(summary.weakTopics[0].topicName || 'CONCEPT').toUpperCase()}`
                    : 'CALIBRATE YOUR KNOWLEDGE PROFILE'}
              </h2>
              <p>
                {remediationNudge
                  ? `${remediationNudge.meta?.facultyName || 'Instructor'} assigned an adaptive drill for ${remediationNudge.meta?.topicName || 'this topic'} based on your recent performance.`
                  : summary?.weakTopics && summary.weakTopics.length > 0
                    ? `Adaptive engine identified ${summary.weakTopics[0].topicName} as having low mastery (${summary.weakTopics[0].masteryScore}%). Reinforce this topic with a diagnostic drill.`
                    : 'Start your first diagnostic practice session to generate personalized Bayesian knowledge tracing and topic recommendations.'}
              </p>
            </div>
            <Link
              href={remediationNudge?.meta?.actionUrl || (summary?.weakTopics?.[0] ? `/student/practice?topicId=${summary.weakTopics[0].topicId}` : '/student/practice')}
              className="action-button bg-[#e05033] hover:bg-[#c8432b] text-white flex items-center shrink-0 cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              <span>{summary?.questionsPracticed > 0 ? 'START PRACTICE' : 'BEGIN DIAGNOSTIC'}</span>
              <ArrowRight className="w-4 h-4 ml-4" />
            </Link>
          </div>

          {/* Assigned Course Assessments Alert (If active) */}
          {assignedAssessments.length > 0 && (
            <div className="p-4 border border-[rgba(74,111,165,0.3)] bg-[rgba(74,111,165,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderRadius: 0 }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#1a2540] dark:bg-[#e8edf5] text-white dark:text-[#0c1220] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-[#e05033]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-mono font-bold uppercase text-[#1a2540] dark:text-[#f5f0e8]">
                      OFFICIAL ASSESSMENT ASSIGNED ({assignedAssessments.length} ACTIVE)
                    </h3>
                  </div>
                  <p className="text-xs text-[#4a6fa5] dark:text-[#6a90c5] font-mono font-medium mt-0.5">
                    {assignedAssessments[0].title} ({assignedAssessments[0].courseCode}) • {assignedAssessments[0].durationMinutes}M • {assignedAssessments[0].totalQuestions} QUESTIONS
                  </p>
                </div>
              </div>
              <Link
                href="/student/assessments"
                className="px-4 py-2 bg-[#1a2540] dark:bg-[#e8edf5] text-white dark:text-[#0c1220] font-mono text-xs uppercase font-bold tracking-wider hover:opacity-90 flex items-center gap-2 shrink-0"
                style={{ borderRadius: 0 }}
              >
                <span>OPEN ASSESSMENT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Exact Gleam-Spark 4-Panel Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Panel 1: PERFORMANCE TRAJECTORY / LEARNING VELOCITY */}
            <section className="panel bg-[#faf7f2] dark:bg-[#121b30]">
              <header className="panel-head">
                <div>
                  
                  <h2 className="display">LEARNING VELOCITY</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 bg-[rgba(74,111,165,0.12)] border border-[rgba(74,111,165,0.2)]">
                    <button
                      type="button"
                      onClick={() => handleSourceChange('ALL')}
                      className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider font-semibold transition ${kcSource === 'ALL'
                          ? 'bg-[#1a2540] dark:bg-[#e8edf5] text-white dark:text-[#0c1220]'
                          : 'text-[#4a6fa5] hover:text-[#1a2540] dark:hover:text-[#e8edf5]'
                        }`}
                    >
                      Overall
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSourceChange('PRACTICE')}
                      className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider font-semibold transition ${kcSource === 'PRACTICE'
                          ? 'bg-[#1a2540] dark:bg-[#e8edf5] text-white dark:text-[#0c1220]'
                          : 'text-[#4a6fa5] hover:text-[#1a2540] dark:hover:text-[#e8edf5]'
                        }`}
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSourceChange('ASSESSMENT')}
                      className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider font-semibold transition ${kcSource === 'ASSESSMENT'
                          ? 'bg-[#1a2540] dark:bg-[#e8edf5] text-white dark:text-[#0c1220]'
                          : 'text-[#4a6fa5] hover:text-[#1a2540] dark:hover:text-[#e8edf5]'
                        }`}
                    >
                      Exams
                    </button>
                  </div>

                  <select
                    id="kc-filter-topic"
                    value={kcTopic}
                    onChange={(e) => handleTopicChange(e.target.value)}
                    aria-label="Filter by Topic"
                    className="period-select"
                  >
                    <option value="ALL">ALL TOPICS</option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </header>
              <div className="p-4">
                <LearningCurveChart
                  data={kcCurveData}
                  sourceFilter={kcSource}
                  topicFilter={kcTopic}
                  isLoading={kcLoading}
                />
              </div>
            </section>

            {/* Panel 2: KNOWLEDGE MODEL / LIVE / TOPIC MASTERY */}
            <section className="panel bg-[#faf7f2] dark:bg-[#121b30]">
              <header className="panel-head">
                <div>
                
                  <h2 className="display">TOPIC MASTERY</h2>
                </div>
                <span className="panel-meta mono coral">AVG {summary?.overallMastery ?? 0}%</span>
              </header>
              <div className="topic-list">
                {displayTopics.length > 0 ? (
                  displayTopics.map((topic: any) => (
                    <div className="topic-row" key={topic.name}>
                      <div className="topic-info">
                        <span>{topic.name}</span>
                        <strong>{topic.percent}%</strong>
                      </div>
                      <div className="topic-bar">
                        <span style={{ width: `${topic.percent}%` }} />
                      </div>
                      <div className="topic-status">{topic.status}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#4a6fa5] dark:text-[#6a90c5] font-mono">
                    NO TOPIC MASTERY DATA YET &bull; COMPLETE PRACTICE SESSIONS TO POPULATE
                  </div>
                )}
              </div>
            </section>

            {/* Panel 3: COGNITIVE DIAGNOSTICS / SKILL MATRIX */}
            <section className="panel bg-[#faf7f2] dark:bg-[#121b30]">
              <header className="panel-head">
                <div>
                  <h2 className="display">SKILL MATRIX</h2>
                </div>
              </header>
              {skillMatrixRows.length > 0 ? (
                <table className="skill-table">
                  <thead>
                    <tr>
                      <th />
                      <th>CONCEPT</th>
                      <th>APPLICATION</th>
                      <th>PROBLEM SOLVING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillMatrixRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        {row.scores.map((v, i) => (
                          <td
                            key={i}
                            className={
                              Number(v) >= 80
                                ? 'heat-strong'
                                : Number(v) >= 70
                                  ? 'heat-medium'
                                  : Number(v) >= 55
                                    ? 'heat-low'
                                    : 'heat-priority'
                            }
                          >
                            {v}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-[#4a6fa5] dark:text-[#6a90c5] font-mono">
                  NO COGNITIVE SKILL TELEMETRY YET &bull; ATTEMPT DIAGNOSTIC DRILLS TO BENCHMARK SKILL DIMENSIONS
                </div>
              )}
            </section>

            {/* Panel 4: AI RECOMMENDATIONS / NEXT BEST ACTIONS */}
            <section className="panel bg-[#faf7f2] dark:bg-[#121b30]">
              <header className="panel-head">
                <div>
                  <h2 className="display">NEXT BEST ACTIONS</h2>
                </div>
              </header>
              {recommendations.map(([name, meta, topicId, actionUrl], i) => (
                <Link
                  key={name}
                  href={actionUrl || (topicId ? `/student/practice?topicId=${topicId}` : '/student/practice')}
                  className="recommendation cursor-pointer hover:bg-[rgba(74,111,165,0.08)] transition flex items-center gap-4"
                >
                  <span className="mono">0{i + 1}</span>
                  <span className="recommendation-text">
                    {name}
                    <small>{meta}</small>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#e05033] shrink-0" />
                </Link>
              ))}
            </section>
          </div>

          {/* Strengths & Weaknesses Triage */}
          <div className="bg-[#faf7f2] dark:bg-[#121b30] p-6 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm flex flex-col justify-between space-y-4" style={{ borderRadius: 0 }}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-rose-500" />
                Conceptual Focus Areas
              </h3>
              {/* Priority Weak Topics */}
              <div className="mb-5">
                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Needs Immediate Practice:
                </span>
                <div className="space-y-2">
                  {summary?.weakTopics && summary.weakTopics.length > 0 ? (
                    summary.weakTopics.map((wt: any) => (
                      <Link
                        key={wt.topicId}
                        href={`/student/practice?topicId=${wt.topicId}`}
                        className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition flex items-center gap-1.5">
                            {wt.topicName}
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
                            {wt.courseCode} • {wt.attemptCount || 0} attempts
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400">
                            {wt.masteryScore}%
                          </span>
                          <span className="block text-xs text-rose-500 font-semibold">
                            Target 70%
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : summary?.questionsPracticed > 0 ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                      🎉 All practiced topics have reached mastery (&ge;70%)! Select any topic in the curriculum to level up.
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-400 italic">No weak topics identified yet. Start practicing to calibrate.</p>
                  )}
                </div>
              </div>

              {/* Mastered Concepts */}
              <div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mastered Concepts (&ge;70%):
                </span>
                <div className="space-y-2">
                  {summary?.strongTopics && summary.strongTopics.length > 0 ? (
                    summary.strongTopics.map((st: any) => (
                      <div
                        key={st.topicId}
                        className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{st.topicName}</p>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
                            {st.courseCode} • {st.accuracy}% accuracy
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{st.masteryScore}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-400 italic">Complete practice and achieve 70%+ score to promote topics here.</p>
                  )}
                </div>
              </div>
            </div>

            <Link
              href="/student/practice"
              prefetch={false}
              className="w-full py-3 text-center text-xs font-mono font-bold text-[#e05033] dark:text-[#e8604a] bg-[rgba(224,80,51,0.08)] hover:bg-[rgba(224,80,51,0.14)] border border-[rgba(224,80,51,0.3)] transition uppercase tracking-widest" style={{ borderRadius: 0 }}
            >
              Target Weak Areas Now →
            </Link>
          </div>


          {/* Phase 2: Bayesian Knowledge Tracing, Forgetting Curves & Prerequisite DAG */}
          <Phase2IntelligencePanel />

          {/* Detailed Topic Mastery Breakdown */}
          <div className="bg-[#faf7f2] dark:bg-[#121b30] p-6 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm space-y-4" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Detailed Topic Mastery Breakdown
                </h3>
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
          <div className="bg-[#faf7f2] dark:bg-[#121b30] p-6 border border-[rgba(74,111,165,0.25)] dark:border-[rgba(106,144,197,0.2)] shadow-sm" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Recent Practice Activity
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                summary.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${act.isCorrect
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
