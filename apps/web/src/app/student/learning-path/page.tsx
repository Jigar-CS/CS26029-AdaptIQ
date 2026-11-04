'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Play,
  RotateCcw,
  Clock,
  Layers,
  BrainCircuit,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface KnowledgeGraphNode {
  id: string;
  slug: string;
  name: string;
  courseCode: string;
  rawMastery: number;
  decayedMastery: number;
  bktProbability: number;
  status: 'MASTERED' | 'READY_FOR_PRACTICE' | 'NEEDS_PREREQUISITE' | 'BLOCKED';
  isPrerequisiteSatisfied: boolean;
  prerequisites: string[];
}

interface CourseKnowledgeGraph {
  courseCode: string;
  courseName: string;
  nodes: KnowledgeGraphNode[];
  edges: { from: string; to: string; minRequiredMastery: number }[];
  overallCurriculumReadiness: number;
  unlockedTopicsCount: number;
  blockedTopicsCount: number;
}

export default function StudentLearningPath() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isPinned } = useSidebar();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('CS301');
  const [graph, setGraph] = useState<CourseKnowledgeGraph | null>(null);
  const [spacedQueue, setSpacedQueue] = useState<any[]>([]);
  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);

  const courseDueReviews = useMemo(() => {
    if (!Array.isArray(spacedQueue)) return [];
    return spacedQueue.filter((s: any) => {
      const matchesCourse =
        !s.courseCode ||
        s.courseCode.toLowerCase() === selectedCourseCode.toLowerCase();
      const isDue =
        s.isOverdue === true ||
        s.status === 'DUE' ||
        (typeof s.daysRemainingOrOverdue === 'number' && s.daysRemainingOrOverdue <= 0);
      return matchesCourse && isDue;
    });
  }, [spacedQueue, selectedCourseCode]);

  const handleCourseChange = (newCode: string) => {
    setSelectedCourseCode(newCode);
    setGraph(null);
    setSelectedNode(null);
    setError(null);
    try {
      localStorage.setItem('clias_selected_course_code', newCode);
    } catch {}
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      api
        .get('/courses')
        .then((courseList: any) => {
          if (Array.isArray(courseList) && courseList.length > 0) {
            setCourses(courseList);

            // Read URL params first, then localStorage, else fallback to default course
            const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const queryCode = params?.get('courseCode') || params?.get('subjectCode');
            const queryId = params?.get('courseId');
            let savedCode: string | null = null;
            try {
              savedCode = localStorage.getItem('clias_selected_course_code');
            } catch {}

            const matched =
              (queryCode && courseList.find((c: any) => c.code.toLowerCase() === queryCode.toLowerCase())) ||
              (queryId && courseList.find((c: any) => c.id === queryId)) ||
              (savedCode && courseList.find((c: any) => c.code.toLowerCase() === savedCode.toLowerCase())) ||
              courseList[0];

            if (matched && matched.code) {
              setSelectedCourseCode(matched.code);
            }
          }
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load courses.');
        });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && selectedCourseCode) {
      loadLearningPath(selectedCourseCode);
    }
  }, [user, selectedCourseCode]);

  const loadLearningPath = async (courseCode: string) => {
    setLoading(true);
    setError(null);
    setGraph(null);
    setSelectedNode(null);
    try {
      const [graphData, queueData, miscData] = await Promise.all([
        api.get(`/analytics/student/me/knowledge-graph?courseCode=${encodeURIComponent(courseCode)}`).catch((e) => {
          throw e;
        }),
        api.get(`/adaptive/spaced-queue?courseCode=${encodeURIComponent(courseCode)}`).catch(() => []),
        api.get('/adaptive/misconceptions').catch(() => []),
      ]);

      if (graphData && Array.isArray(graphData.nodes) && graphData.nodes.length > 0) {
        setGraph(graphData);
        setSelectedNode(graphData.nodes[0]);
      } else if (graphData && Array.isArray(graphData.nodes)) {
        setGraph(graphData);
        setSelectedNode(null);
      } else {
        setGraph(null);
        setSelectedNode(null);
      }

      setSpacedQueue(Array.isArray(queueData) ? queueData : []);
      setMisconceptions(Array.isArray(miscData) ? miscData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize cognitive learning pathway.');
      setGraph(null);
      setSelectedNode(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MASTERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Mastered
          </span>
        );
      case 'READY_FOR_PRACTICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Unlock className="w-3 h-3" /> Unlocked / Ready
          </span>
        );
      case 'NEEDS_PREREQUISITE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> Needs Prerequisite
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3 h-3" /> Blocked
          </span>
        );
    }
  };

  return (
    <div className="flex bg-transparent min-h-screen text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'lg:pl-64' : 'lg:pl-[72px]'} pl-0`}>
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                LEARNING PATHWAY
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-xs font-semibold uppercase tracking-wider text-[#6b7fa3]">DAG STATUS</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                {graph?.nodes?.filter((n: any) => n.status === 'MASTERED').length || 4}<span className="font-mono text-sm text-[#e05033]">/{graph?.nodes?.length || 8}</span>
              </strong>
              <p className="mono text-xs font-semibold text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">PREREQUISITES MAPPED</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">COURSE</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{graph?.courseCode || selectedCourseCode}</div>
              <div className="metric-label mono">ACTIVE SUBJECT</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#4a6fa5]">NODES</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{graph?.nodes?.length || 8}</div>
              <div className="metric-label mono">KNOWLEDGE TOPICS</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>DAG</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">EWMA+BKT</div>
              <div className="metric-label mono">ADAPTIVE ENGINE</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">CHARUSAT</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">B.TECH</div>
              <div className="metric-label mono">CURRICULUM ALIGNED</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <h2 className="font-display text-xl uppercase tracking-wide">ADAPTIVE PREREQUISITE SEQUENCING</h2>
              <p className="text-xs text-[#8ba0c0] font-sans">
                Topic nodes dynamically unlock as prerequisite masteries are verified by Bayesian Knowledge Tracing.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {courses.length > 1 && (
                <select
                  value={selectedCourseCode}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="bg-[#1a2540] text-white border border-[rgba(106,144,197,0.3)] text-xs font-mono px-3 py-2 uppercase"
                  style={{ borderRadius: 0 }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} • {c.name}
                    </option>
                  ))}
                </select>
              )}
              <Link
                href={`/student/practice?courseId=${courses.find((c) => c.code === (graph?.courseCode || selectedCourseCode))?.id || ''}&courseCode=${encodeURIComponent(graph?.courseCode || selectedCourseCode)}&from=learning-path`}
                className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
                style={{ borderRadius: 0 }}
              >
                <Play className="w-3.5 h-3.5 mr-2 fill-white" />
                <span>PRACTICE NOW</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">Synthesizing personal knowledge graph & prerequisite mastery...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <p className="font-semibold text-sm">Failed to Load Learning Pathway</p>
              <p className="text-xs mt-1 text-rose-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Macro Readiness KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs mb-2 font-bold">
                    <span>Curriculum Readiness</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {graph?.overallCurriculumReadiness || 0}%
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${graph?.overallCurriculumReadiness || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs mb-2 font-bold">
                    <span>Mastered Topics</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {graph?.nodes.filter((n) => n.status === 'MASTERED').length || 0}
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-1.5">
                      / {graph?.nodes.length || 0} Topics
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs mb-2 font-bold">
                    <span>Unlocked & Actionable</span>
                    <Unlock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {graph?.unlockedTopicsCount || 0}
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-1.5">Available for drill</span>
                  </div>
                  
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs mb-2 font-bold">
                    <span>Spaced Review Queue</span>
                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {courseDueReviews.length}
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-1.5">Topics Due</span>
                  </div>
                 
                </div>
              </div>

              {/* Main Content: Visual DAG Pathway + Selected Node Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Step-by-Step Prerequisite DAG Roadmap */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Sequential Curriculum Knowledge Tree
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {!graph || !graph.nodes || graph.nodes.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                        <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <div className="font-semibold text-slate-700 dark:text-slate-300">No Learning Path Available Yet</div>
                        <div className="text-xs text-slate-500 max-w-sm mx-auto">
                          As you begin adaptive practice and assessments in CS301, the system dynamically discovers topics and plots your real-time prerequisite DAG.
                        </div>
                      </div>
                    ) : (
                      graph.nodes.map((node, idx) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/60 dark:bg-slate-900 border-indigo-500/80 shadow-xs'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  node.status === 'MASTERED'
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : node.status === 'READY_FOR_PRACTICE'
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </div>

                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{node.name}</h3>
                                  {getStatusBadge(node.status)}
                                </div>

                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    Raw Mastery:{' '}
                                    <strong className="text-slate-800 dark:text-slate-200">{Math.round(node.rawMastery)}%</strong>
                                  </span>
                                  <span>
                                    Decayed:{' '}
                                    <strong className="text-slate-800 dark:text-slate-200">{Math.round(node.decayedMastery)}%</strong>
                                  </span>
                                  <span>
                                    BKT <span className="font-mono text-xs font-semibold">P(L)</span>:{' '}
                                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                                      {(node.bktProbability * 100).toFixed(0)}%
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <ChevronRight
                              className={`w-4 h-4 shrink-0 transition-transform ${
                                isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-1' : 'text-slate-400 dark:text-slate-600'
                              }`}
                            />
                          </div>

                          {/* Mini Mastery Bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-3.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                node.status === 'MASTERED'
                                  ? 'bg-emerald-500'
                                  : node.status === 'READY_FOR_PRACTICE'
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.max(5, node.decayedMastery)}%` }}
                            />
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                </div>

                {/* Right Col: Node Inspector & Personalized Action Card */}
                <div className="space-y-6">
                  {selectedNode ? (
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 sticky top-6 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{selectedNode.name}</h3>
                        </div>
                        {getStatusBadge(selectedNode.status)}
                      </div>

                      {/* Detailed Metric Breakout */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Current Retention Index</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {Math.round(selectedNode.decayedMastery)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Latent Probability P(L)</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {(selectedNode.bktProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Prerequisite Readiness</span>
                          <span
                            className={`font-semibold ${
                              selectedNode.isPrerequisiteSatisfied ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {selectedNode.isPrerequisiteSatisfied ? 'Cleared (100%)' : 'Deficit Detected'}
                          </span>
                        </div>
                      </div>

                      {/* Prerequisite Check */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                          Prerequisite Topics
                        </span>
                        {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedNode.prerequisites.map((prereq) => (
                              <div
                                key={prereq}
                                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                <span className="font-mono text-xs font-semibold">{prereq}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Min 60% Met
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium">
                            Foundational concept. No prior prerequisites required.
                          </p>
                        )}
                      </div>

                      {/* Remedial & Drill CTA */}
                      <div className="pt-2">
                        {selectedNode.status === 'BLOCKED' || selectedNode.status === 'NEEDS_PREREQUISITE' || !selectedNode.isPrerequisiteSatisfied ? (
                          <button
                            disabled
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Clear Earlier Prerequisites First
                          </button>
                        ) : (
                          <Link
                            href={`/student/practice?courseId=${courses.find((c) => c.code === (graph?.courseCode || selectedCourseCode))?.id || ''}&courseCode=${encodeURIComponent(graph?.courseCode || selectedCourseCode)}&topicId=${selectedNode.id}&topicSlug=${encodeURIComponent(selectedNode.slug)}&from=learning-path`}
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 text-center"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Drill This Concept
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Spaced Repetition Due Queue Section */}
              {spacedQueue.length > 0 && (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Ebbinghaus Memory Reinforcement Queue ({spacedQueue.length} Due)
                    </h3>
                    <Link
                      href="/student/practice"
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                    >
                      Reinforce All <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-xs text-slate-400">
                    These topics are decaying according to the Ebbinghaus forgetting curve. Complete a 3-minute refresher to restore retention above 80%.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
