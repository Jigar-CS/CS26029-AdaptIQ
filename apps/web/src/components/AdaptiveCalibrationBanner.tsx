'use client';

import React from 'react';
import { Sparkles, Sliders, TrendingUp, Cpu } from 'lucide-react';

interface CalibrationData {
  topicId: string;
  topicName: string;
  currentMastery: number;
  recommendedDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  confidenceInterval: { low: number; high: number };
  pedagogicalRationale: string;
}

interface AdaptiveCalibrationBannerProps {
  calibration: CalibrationData | null;
  adaptiveMode: boolean;
  onToggleAdaptive: () => void;
  selectedDifficulty?: string;
}

export function AdaptiveCalibrationBanner({
  calibration,
  adaptiveMode,
  onToggleAdaptive,
  selectedDifficulty = 'MEDIUM',
}: AdaptiveCalibrationBannerProps) {
  if (!calibration) return null;

  const activeDifficulty = (adaptiveMode
    ? calibration.recommendedDifficulty
    : (selectedDifficulty as 'EASY' | 'MEDIUM' | 'HARD') || calibration.recommendedDifficulty) as
    | 'EASY'
    | 'MEDIUM'
    | 'HARD';

  const difficultyColors = {
    EASY: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-xs',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-xs',
    HARD: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 shadow-xs',
  };

  const difficultyLabels = {
    EASY: 'Level 1: Scaffolding Foundations',
    MEDIUM: 'Level 2: Analytical Application',
    HARD: 'Level 3: Edge-Case Synthesis',
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-5 shadow-xs dark:shadow-xl relative overflow-hidden transition-colors duration-200">
      {/* Subtle Ambient Accent */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-indigo-100 dark:bg-indigo-500/20 p-2.5 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 mt-0.5 shrink-0 shadow-xs">
            <Cpu className="h-5 w-5 animate-pulse text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                {adaptiveMode ? 'Adaptive Difficulty Calibration' : 'Manual Feature Calibration'}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                adaptiveMode
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                  : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
              }`}>
                <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                {adaptiveMode ? 'Adaptive Engine' : 'Custom Calibration'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {adaptiveMode
                ? calibration.pedagogicalRationale
                : `Manual challenge calibration active (${activeDifficulty}). You are manually calibrating to practice ${activeDifficulty.toLowerCase()}-tier conceptual questions in ${calibration.topicName}, overriding the automatic diagnostic baseline.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 self-end sm:self-center shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {adaptiveMode ? 'Calibrated Tier' : 'User-Selected Tier'}
            </div>
            <span
              className={`inline-block mt-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                difficultyColors[activeDifficulty] || difficultyColors.MEDIUM
              }`}
            >
              {activeDifficulty} • {difficultyLabels[activeDifficulty] || 'Custom Tier'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleAdaptive}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border shadow-xs ${
              adaptiveMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:border-indigo-400/40 shadow-indigo-600/20'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-amber-500/20'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            {adaptiveMode ? 'Auto-Calibrated' : 'Manual Override'}
          </button>
        </div>
      </div>

      {/* Mastery & Confidence Interval Bar */}
      <div className="relative z-10 mt-4 pt-3.5 border-t border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-300 gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Active Mastery in <strong className="text-slate-900 dark:text-white font-semibold">{calibration.topicName}</strong>:</span>
          <span className="font-extrabold text-indigo-800 dark:text-white text-xs bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-md">
            {calibration.currentMastery.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">95% Latent Ability Range:</span>
          <div className="w-36 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full shadow-xs"
              style={{
                width: `${Math.max(8, calibration.confidenceInterval.high - calibration.confidenceInterval.low)}%`,
                marginLeft: `${calibration.confidenceInterval.low}%`,
              }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
            [{calibration.confidenceInterval.low.toFixed(0)}% – {calibration.confidenceInterval.high.toFixed(0)}%]
          </span>
        </div>
      </div>
    </div>
  );
}
