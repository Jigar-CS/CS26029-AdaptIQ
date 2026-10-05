'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Brain,
  Clock,
  GitFork,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  Layers,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export function Phase2IntelligencePanel() {
  const [activeTab, setActiveTab] = useState<'bkt' | 'decay' | 'graph'>('bkt');
  const [loading, setLoading] = useState(false);
  const [bktData, setBktData] = useState<any>(null);
  const [retentionData, setRetentionData] = useState<any>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab: 'bkt' | 'decay' | 'graph') => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'bkt' && !bktData) {
        const res = await api.get('/analytics/student/me/bkt-comparison');
        setBktData(res);
      } else if (tab === 'decay' && !retentionData) {
        const res = await api.get('/analytics/student/me/retention');
        setRetentionData(res);
      } else if (tab === 'graph' && !graphData) {
        const res = await api.get('/analytics/student/me/knowledge-graph?courseCode=CS301');
        setGraphData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch learning intelligence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md overflow-hidden transition-colors duration-200">
      {/* Header with Badges */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Cognitive Intelligence Active</span>
          </div>
          <h3 className="text-xl font-black tracking-tight">Advanced Student Knowledge Modeling</h3>
          <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
            Mathematical validation across Bayesian Knowledge Tracing (BKT), Item Response Theory (IRT), Ebbinghaus Forgetting Curves, and Multi-Topic Prerequisite DAGs.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 shrink-0">
          <button
            onClick={() => setActiveTab('bkt')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'bkt'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>BKT & IRT Benchmark</span>
          </button>
          <button
            onClick={() => setActiveTab('decay')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'decay'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Retention & Decay</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'graph'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Knowledge Graph</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Evaluating probabilistic learning models...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        ) : (
          <>
            {/* TAB 1: BKT & IRT BENCHMARK */}
            {activeTab === 'bkt' && bktData && (
              <div className="space-y-6">
                {/* Dynamic Cognitive Intelligence Advice Card */}
                {bktData.cognitiveAdvice && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                              Cognitive Intelligence Advice
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                bktData.cognitiveAdvice.urgency === 'HIGH'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                                  : bktData.cognitiveAdvice.urgency === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}
                            >
                              {bktData.cognitiveAdvice.focusType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
                            {bktData.cognitiveAdvice.headline}
                          </p>
                        </div>
                      </div>

                      {bktData.cognitiveAdvice.targetTopicId && (
                        <a
                          href={`/student/practice?topicId=${bktData.cognitiveAdvice.targetTopicId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm shrink-0"
                        >
                          <span>Practice {bktData.cognitiveAdvice.targetTopicName}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {bktData.cognitiveAdvice.advice}
                    </p>

                    {bktData.cognitiveAdvice.actionItems && bktData.cognitiveAdvice.actionItems.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-indigo-100/80 dark:border-slate-800">
                        {bktData.cognitiveAdvice.actionItems.map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Latent Ability Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      θ
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        IRT Latent Ability (θ)
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {bktData.totalTopicsEvaluated > 0
                          ? bktData.overallIrtAbility?.theta >= 0
                            ? `+${bktData.overallIrtAbility?.theta}`
                            : bktData.overallIrtAbility?.theta
                          : '0.00 (Uncalibrated)'}
                      </p>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold">
                        {bktData.totalTopicsEvaluated > 0
                          ? `${bktData.overallIrtAbility?.abilityPercentile ?? 50}th Percentile Rank`
                          : 'Baseline Calibration'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      P(L)
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        BKT Knowledge State
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">Probabilistic Tracing</p>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        Slip: 10% | Guess: 20% | Transition: 15%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                      α
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        EWMA Recency Weight
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">α = 0.25</p>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                        Difficulty-Weighted (1.0x - 1.5x)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Comparison Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Topic</th>
                        <th className="p-3">EWMA Score</th>
                        <th className="p-3">BKT P(L)</th>
                        <th className="p-3">Difference</th>
                        <th className="p-3">Model Concordance</th>
                        <th className="p-3">Recommended Mastery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {bktData.topicComparisons && bktData.topicComparisons.length > 0 ? (
                        bktData.topicComparisons.map((t: any) => (
                          <tr key={t.topicId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 dark:text-white">{t.topicName}</span>
                              <span className="block text-[10px] text-slate-400">{t.courseCode}</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              {t.ewmaScore}%
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {t.bktProbabilityPct}%
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              ±{t.difference}%
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  t.concordance === 'STRONG_AGREEMENT'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                                }`}
                              >
                                {t.concordance.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                              {t.recommendedMastery}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                            No topics evaluated yet. Complete practice questions to benchmark EWMA vs Bayesian Knowledge Tracing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: FORGETTING CURVE & RETENTION */}
            {activeTab === 'decay' && retentionData && (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Raw Baseline</p>
                    <p className="text-xl font-black text-slate-900">
                      {retentionData.overallRawMastery}%
                    </p>
                    <span className="text-[10px] text-slate-500">Unadjusted Score</span>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <p className="text-[11px] font-bold text-indigo-600 uppercase">Effective Mastery</p>
                    <p className="text-xl font-black text-indigo-900">
                      {retentionData.overallEffectiveMastery}%
                    </p>
                    <span className="text-[10px] text-indigo-700">Decayed Retention</span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[11px] font-bold text-amber-600 uppercase">Reviews Due</p>
                    <p className="text-xl font-black text-amber-900">
                      {retentionData.reviewsDueCount} Topics
                    </p>
                    <span className="text-[10px] text-amber-700">Spaced Repetition Trigger</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase">Retention Index</p>
                    <p className="text-xl font-black text-emerald-900">
                      {retentionData.overallRetentionRate}%
                    </p>
                    <span className="text-[10px] text-emerald-700">Consolidated Memory</span>
                  </div>
                </div>

                {/* Topics Retention Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ebbinghaus Concept Decay Status
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {retentionData.topics && retentionData.topics.length > 0 ? (
                      retentionData.topics.map((topic: any) => (
                        <div
                          key={topic.topicId}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {topic.courseCode}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">{topic.topicName}</h5>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                topic.retentionStatus === 'FRESH'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : topic.retentionStatus === 'STABLE'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {topic.retentionStatus.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-500">
                              Last practiced {topic.daysSinceLastPractice}d ago
                            </span>
                            <span className="font-extrabold text-slate-800">
                              Effective: {topic.decayedMastery}%{' '}
                              <span className="text-slate-400 font-normal">
                                (Raw: {topic.rawMastery}%)
                              </span>
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                topic.retentionRatePct >= 80
                                  ? 'bg-emerald-500'
                                  : topic.retentionRatePct >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${topic.retentionRatePct}%` }}
                            ></div>
                          </div>

                          <p className="text-[11px] text-slate-500 italic">
                            {topic.decayExplanation}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-8 text-center text-slate-400 italic bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No topic retention records found. Practice questions to begin tracking Ebbinghaus memory decay.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MULTI-TOPIC KNOWLEDGE DEPENDENCY GRAPH */}
            {activeTab === 'graph' && graphData && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {graphData.courseName} ({graphData.courseCode}) Directed Acyclic Graph
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pedagogical prerequisite dependency tree enforcing mastery continuity before advanced concepts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                      {graphData.unlockedTopicsCount} Unlocked
                    </span>
                    <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-lg">
                      {graphData.blockedTopicsCount} Pending Prerequisites
                    </span>
                  </div>
                </div>

                {/* Nodes Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {graphData.nodes?.map((node: any) => (
                    <div
                      key={node.id}
                      className={`p-4 rounded-xl border transition ${
                        node.status === 'MASTERED'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : node.status === 'READY_FOR_PRACTICE'
                          ? 'bg-white border-slate-200'
                          : 'bg-amber-50/40 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Node
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            node.status === 'MASTERED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : node.status === 'READY_FOR_PRACTICE'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {node.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 mb-2">{node.name}</h5>

                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500">Knowledge Mastery</span>
                        <span className="font-extrabold text-slate-900">{node.rawMastery}%</span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, node.rawMastery))}%` }}
                        ></div>
                      </div>

                      {node.prerequisites && node.prerequisites.length > 0 && (
                        <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                          <span className="font-bold text-slate-600">Requires: </span>
                          <span>{node.prerequisites.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
