'use client';

import React from 'react';
import { Sparkles, Sliders, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';

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
}

export function AdaptiveCalibrationBanner({
  calibration,
  adaptiveMode,
  onToggleAdaptive,
}: AdaptiveCalibrationBannerProps) {
  if (!calibration) return null;

  const difficultyColors = {
    EASY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm',
    HARD: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm',
  };

  const difficultyLabels = {
    EASY: 'Level 1: Scaffolding Foundations',
    MEDIUM: 'Level 2: Analytical Application',
    HARD: 'Level 3: Edge-Case Synthesis',
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-slate-900 p-5 shadow-xl relative overflow-hidden text-slate-100">
      {/* Subtle Ambient Accent */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-indigo-500/20 p-2.5 text-indigo-400 border border-indigo-500/30 mt-0.5 shrink-0 shadow-sm">
            <Cpu className="h-5 w-5 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-extrabold text-white text-base tracking-tight">
                Adaptive Difficulty Calibration
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                Adaptive Engine
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
              {calibration.pedagogicalRationale}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 self-end sm:self-center shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Calibrated Tier
            </div>
            <span
              className={`inline-block mt-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                difficultyColors[calibration.recommendedDifficulty]
              }`}
            >
              {calibration.recommendedDifficulty} • {difficultyLabels[calibration.recommendedDifficulty]}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleAdaptive}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border shadow-sm ${
              adaptiveMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-indigo-600/30 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            {adaptiveMode ? 'Auto-Calibrated' : 'Manual Override'}
          </button>
        </div>
      </div>

      {/* Mastery & Confidence Interval Bar */}
      <div className="relative z-10 mt-4 pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-300 gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Active Mastery in <strong className="text-white font-semibold">{calibration.topicName}</strong>:</span>
          <span className="font-extrabold text-white text-xs bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md">
            {calibration.currentMastery.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-medium">95% Latent Ability Range:</span>
          <div className="w-36 bg-slate-950 border border-slate-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full shadow-sm"
              style={{
                width: `${Math.max(8, calibration.confidenceInterval.high - calibration.confidenceInterval.low)}%`,
                marginLeft: `${calibration.confidenceInterval.low}%`,
              }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-indigo-300">
            [{calibration.confidenceInterval.low.toFixed(0)}% – {calibration.confidenceInterval.high.toFixed(0)}%]
          </span>
        </div>
      </div>
    </div>
  );
}
