import React from 'react';

interface TopicMasteryProps {
  topicName: string;
  courseCode: string;
  masteryScore: number;
  decayedMastery?: number;
  retentionStatus?: 'FRESH' | 'STABLE' | 'DECAYING' | 'CRITICAL_DECAY';
  attemptCount?: number;
  accuracy?: number;
  onPracticeClick?: () => void;
}

export function TopicMasteryCard({
  topicName,
  courseCode,
  masteryScore,
  decayedMastery,
  retentionStatus,
  attemptCount,
  onPracticeClick,
}: TopicMasteryProps) {
  const score = Math.round(masteryScore);
  const effectiveScore = decayedMastery !== undefined ? Math.round(decayedMastery) : score;

  let statusBadge = {
    label: 'Needs Practice',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    barColor: 'bg-rose-500',
  };

  if (score >= 75) {
    statusBadge = {
      label: 'Mastered',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
      barColor: 'bg-emerald-500',
    };
  } else if (score >= 60) {
    statusBadge = {
      label: 'Proficient',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40',
      barColor: 'bg-indigo-600',
    };
  } else if (score >= 40) {
    statusBadge = {
      label: 'Developing',
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
      barColor: 'bg-amber-500',
    };
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md hover-lift flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {courseCode}
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{topicName}</h4>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            {retentionStatus && (retentionStatus === 'DECAYING' || retentionStatus === 'CRITICAL_DECAY') && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                Decay Alert
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Topic Mastery</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 dark:text-white">{score}%</span>
              {decayedMastery !== undefined && effectiveScore < score && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold" title="Decayed effective retention score">
                  ({effectiveScore}%)
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusBadge.barColor}`}
              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{attemptCount ? `${attemptCount} attempts` : 'No attempts'}</span>
        {onPracticeClick && (
          <button
            onClick={onPracticeClick}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1"
          >
            Practice Topic
          </button>
        )}
      </div>
    </div>
  );
}
