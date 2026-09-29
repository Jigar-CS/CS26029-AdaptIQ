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
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HARD: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const difficultyLabels = {
    EASY: 'Level 1: Scaffolding Foundations',
    MEDIUM: 'Level 2: Analytical Application',
    HARD: 'Level 3: Edge-Case Synthesis',
  };

  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-500/20 p-2.5 text-indigo-400 border border-indigo-500/30 mt-0.5">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold text-white text-base">
                Adaptive Difficulty Calibration
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <Sparkles className="h-3 w-3" />
                Phase 4 Engine
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
              {calibration.pedagogicalRationale}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Calibrated Tier
            </div>
            <span
              className={`inline-block mt-0.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                difficultyColors[calibration.recommendedDifficulty]
              }`}
            >
              {calibration.recommendedDifficulty} • {difficultyLabels[calibration.recommendedDifficulty]}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleAdaptive}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
              adaptiveMode
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            {adaptiveMode ? 'Auto-Calibrated' : 'Manual Override'}
          </button>
        </div>
      </div>

      {/* Mastery & Confidence Interval Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <span>Active Mastery in <strong>{calibration.topicName}</strong>:</span>
          <span className="font-bold text-white text-sm">{calibration.currentMastery.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">95% Latent Ability Range:</span>
          <div className="w-36 bg-slate-800 h-2 rounded-full overflow-hidden relative">
            <div
              className="bg-indigo-500 h-full rounded-full"
              style={{
                width: `${calibration.confidenceInterval.high - calibration.confidenceInterval.low}%`,
                marginLeft: `${calibration.confidenceInterval.low}%`,
              }}
            />
          </div>
          <span className="font-mono text-[11px] text-indigo-300">
            [{calibration.confidenceInterval.low.toFixed(0)}% – {calibration.confidenceInterval.high.toFixed(0)}%]
          </span>
        </div>
      </div>
    </div>
  );
}
