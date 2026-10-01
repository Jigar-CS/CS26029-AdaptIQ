'use client';

import React from 'react';
import { AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

interface MisconceptionData {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  remediationAdvice: string;
}

interface MisconceptionAlertCardProps {
  misconception: MisconceptionData;
  occurrenceCount?: number;
  onExploreRemediation?: () => void;
}

export function MisconceptionAlertCard({
  misconception,
  occurrenceCount,
  onExploreRemediation,
}: MisconceptionAlertCardProps) {
  const categoryLabels: Record<string, { label: string; color: string }> = {
    CONCEPTUAL_CONFUSION: { label: 'Conceptual Trap', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40' },
    OFF_BY_ONE_ERROR: { label: 'Off-By-One Boundary', color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40' },
    COMPLEXITY_MISCALCULATION: { label: 'Complexity Estimation', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40' },
    BOUNDARY_EDGE_CASE: { label: 'Edge-Case Omission', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40' },
    POINTER_REFERENCE_CONFUSION: { label: 'Pointer/Reference Mutation', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40' },
    SYNTAX_SEMANTICS_OVERLOOK: { label: 'Semantic Overlook', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40' },
  };

  const badge = categoryLabels[misconception.category] || {
    label: misconception.category.replace(/_/g, ' '),
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-xs dark:shadow-xl transition-colors duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-amber-100 dark:bg-amber-500/20 p-2 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                {misconception.code}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.color}`}>
                {badge.label}
              </span>
              {occurrenceCount && occurrenceCount > 1 && (
                <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60">
                  Detected {occurrenceCount} times
                </span>
              )}
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm mt-1">
              {misconception.title}
            </h4>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <strong className="text-amber-700 dark:text-amber-300 font-semibold block mb-0.5">Identified Cognitive Gap:</strong>
        {misconception.description}
      </p>

      <div className="mt-3 flex items-start gap-2.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3">
        <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
          <strong className="text-indigo-950 dark:text-white block font-medium">Remediation Blueprint:</strong>
          {misconception.remediationAdvice}
        </div>
      </div>

      {onExploreRemediation && (
        <button
          type="button"
          onClick={onExploreRemediation}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
        >
          <span>Ask Socratic Tutor about this concept</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
