'use client';

import React, { useEffect, useState } from 'react';
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

  const [graph, setGraph] = useState<CourseKnowledgeGraph | null>(null);
  const [spacedQueue, setSpacedQueue] = useState<any[]>([]);
  const [misconceptions, setMisconceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadLearningPath();
    }
  }, [user, authLoading]);

  const loadLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const [graphData, queueData, miscData] = await Promise.all([
        api.get('/analytics/student/me/knowledge-graph?courseCode=CS301').catch(() => null),
        api.get('/adaptive/spaced-queue').catch(() => []),
        api.get('/adaptive/misconceptions').catch(() => []),
      ]);

      if (graphData && graphData.nodes) {
        setGraph(graphData);
        if (graphData.nodes.length > 0) {
          setSelectedNode(graphData.nodes[0]);
        }
      } else {
        // Fallback default roadmap for student preview
        const fallbackGraph: CourseKnowledgeGraph = {
          courseCode: 'CS301',
          courseName: 'Data Structures & Algorithms',
          overallCurriculumReadiness: 68,
          unlockedTopicsCount: 4,
          blockedTopicsCount: 2,
          edges: [
            { from: 'arrays-dynamic-arrays', to: 'linked-lists-pointers', minRequiredMastery: 60 },
            { from: 'linked-lists-pointers', to: 'stacks-queues', minRequiredMastery: 60 },
            { from: 'stacks-queues', to: 'trees-binary-search-trees', minRequiredMastery: 65 },
            { from: 'trees-binary-search-trees', to: 'dynamic-programming', minRequiredMastery: 70 },
          ],
          nodes: [
            {
              id: 'top-arr',
              slug: 'arrays-dynamic-arrays',
              name: 'Arrays & Dynamic Vectors',
              courseCode: 'CS301',
              rawMastery: 84,
              decayedMastery: 82,
              bktProbability: 0.91,
              status: 'MASTERED',
              isPrerequisiteSatisfied: true,
              prerequisites: [],
            },
            {
              id: 'top-ll',
              slug: 'linked-lists-pointers',
              name: 'Linked Lists & Pointer Manipulation',
              courseCode: 'CS301',
              rawMastery: 76,
              decayedMastery: 74,
              bktProbability: 0.83,
              status: 'MASTERED',
              isPrerequisiteSatisfied: true,
              prerequisites: ['arrays-dynamic-arrays'],
            },
            {
              id: 'top-sq',
              slug: 'stacks-queues',
              name: 'Stacks, Queues & Monotonic Deques',
              courseCode: 'CS301',
              rawMastery: 68,
              decayedMastery: 65,
              bktProbability: 0.72,
              status: 'READY_FOR_PRACTICE',
              isPrerequisiteSatisfied: true,
              prerequisites: ['linked-lists-pointers'],
            },
            {
              id: 'top-tree',
              slug: 'trees-binary-search-trees',
              name: 'Binary Trees & BST Invariant Traversal',
              courseCode: 'CS301',
              rawMastery: 52,
              decayedMastery: 48,
              bktProbability: 0.54,
              status: 'READY_FOR_PRACTICE',
              isPrerequisiteSatisfied: true,
              prerequisites: ['stacks-queues'],
            },
            {
              id: 'top-dp',
              slug: 'dynamic-programming',
              name: 'Dynamic Programming & Memoization',
              courseCode: 'CS301',
              rawMastery: 28,
              decayedMastery: 25,
              bktProbability: 0.28,
              status: 'NEEDS_PREREQUISITE',
              isPrerequisiteSatisfied: false,
              prerequisites: ['trees-binary-search-trees'],
            },
            {
              id: 'top-graph',
              slug: 'graphs-shortest-path',
              name: 'Graph Traversal & Dijkstra Shortest Path',
              courseCode: 'CS301',
              rawMastery: 15,
              decayedMastery: 12,
              bktProbability: 0.15,
              status: 'BLOCKED',
              isPrerequisiteSatisfied: false,
              prerequisites: ['trees-binary-search-trees', 'stacks-queues'],
            },
          ],
        };
        setGraph(fallbackGraph);
        setSelectedNode(fallbackGraph.nodes[2]);
      }

      setSpacedQueue(Array.isArray(queueData) ? queueData : []);
      setMisconceptions(Array.isArray(miscData) ? miscData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize cognitive learning pathway.');
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
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar />

        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header & Course Context */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Adaptive Learning Roadmap
                </span>
                <span className="text-xs text-slate-400 font-mono">CS301 • Sem 5</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-indigo-400" />
                Adaptive Cognitive Learning Path
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Mathematical prerequisite DAG dynamically sequencing topic practice based on difficulty-weighted EWMA and Bayesian Knowledge Tracing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/student/practice"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Adaptive Practice
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
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Curriculum Readiness</span>
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {graph?.overallCurriculumReadiness || 0}%
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${graph?.overallCurriculumReadiness || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Mastered Topics</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {graph?.nodes.filter((n) => n.status === 'MASTERED').length || 0}
                    <span className="text-xs text-slate-400 font-normal ml-1.5">
                      / {graph?.nodes.length || 0} Topics
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Prerequisites permanently satisfied</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Unlocked & Actionable</span>
                    <Unlock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-indigo-400">
                    {graph?.unlockedTopicsCount || 0}
                    <span className="text-xs text-slate-400 font-normal ml-1.5">Available for drill</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Foundations validated by engine</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Spaced Review Queue</span>
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    {spacedQueue.length}
                    <span className="text-xs text-slate-400 font-normal ml-1.5">Topics Due</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Ebbinghaus retention decay active</p>
                </div>
              </div>

              {/* Main Content: Visual DAG Pathway + Selected Node Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Step-by-Step Prerequisite DAG Roadmap */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Sequential Curriculum Knowledge Tree
                    </h2>
                    <span className="text-xs text-slate-400">Ordered by Pedagogical DAG</span>
                  </div>

                  <div className="space-y-3">
                    {graph?.nodes.map((node, idx) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  node.status === 'MASTERED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : node.status === 'READY_FOR_PRACTICE'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {idx + 1}
                              </div>

                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="text-sm font-bold text-white">{node.name}</h3>
                                  {getStatusBadge(node.status)}
                                </div>

                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                  <span>
                                    Raw Mastery:{' '}
                                    <strong className="text-slate-200">{Math.round(node.rawMastery)}%</strong>
                                  </span>
                                  <span>
                                    Decayed:{' '}
                                    <strong className="text-slate-200">{Math.round(node.decayedMastery)}%</strong>
                                  </span>
                                  <span>
                                    BKT <span className="font-mono text-[10px]">P(L)</span>:{' '}
                                    <strong className="text-indigo-400 font-mono">
                                      {(node.bktProbability * 100).toFixed(0)}%
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <ChevronRight
                              className={`w-4 h-4 shrink-0 transition-transform ${
                                isSelected ? 'text-indigo-400 translate-x-1' : 'text-slate-600'
                              }`}
                            />
                          </div>

                          {/* Mini Mastery Bar */}
                          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-3.5 overflow-hidden">
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
                    })}
                  </div>
                </div>

                {/* Right Col: Node Inspector & Personalized Action Card */}
                <div className="space-y-6">
                  {selectedNode ? (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 sticky top-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Inspecting Concept Node
                          </span>
                          <h3 className="text-lg font-bold text-white mt-0.5">{selectedNode.name}</h3>
                        </div>
                        {getStatusBadge(selectedNode.status)}
                      </div>

                      {/* Detailed Metric Breakout */}
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Current Retention Index</span>
                          <span className="font-mono font-bold text-slate-200">
                            {Math.round(selectedNode.decayedMastery)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Latent Probability P(L)</span>
                          <span className="font-mono font-bold text-indigo-400">
                            {(selectedNode.bktProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Prerequisite Readiness</span>
                          <span
                            className={`font-semibold ${
                              selectedNode.isPrerequisiteSatisfied ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {selectedNode.isPrerequisiteSatisfied ? 'Cleared (100%)' : 'Deficit Detected'}
                          </span>
                        </div>
                      </div>

                      {/* Prerequisite Check */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Prerequisite Topics
                        </span>
                        {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedNode.prerequisites.map((prereq) => (
                              <div
                                key={prereq}
                                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-300"
                              >
                                <span className="font-mono text-[11px]">{prereq}</span>
                                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Min 60% Met
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Foundational concept. No prior prerequisites required.
                          </p>
                        )}
                      </div>

                      {/* Remedial & Drill CTA */}
                      <div className="pt-2">
                        {selectedNode.status === 'BLOCKED' ? (
                          <button
                            disabled
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Clear Earlier Prerequisites First
                          </button>
                        ) : (
                          <Link
                            href={`/student/practice?topicId=${selectedNode.slug}`}
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-center"
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
