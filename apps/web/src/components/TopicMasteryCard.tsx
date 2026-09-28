import React from 'react';

interface TopicMasteryProps {
  topicName: string;
  courseCode: string;
  masteryScore: number;
  attemptCount?: number;
  accuracy?: number;
  onPracticeClick?: () => void;
}

export function TopicMasteryCard({
  topicName,
  courseCode,
  masteryScore,
  attemptCount,
  onPracticeClick,
}: TopicMasteryProps) {
  const score = Math.round(masteryScore);

  let statusBadge = {
    label: 'Needs Practice',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    barColor: 'bg-rose-500',
  };

  if (score >= 75) {
    statusBadge = {
      label: 'Mastered',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      barColor: 'bg-emerald-500',
    };
  } else if (score >= 60) {
    statusBadge = {
      label: 'Proficient',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      barColor: 'bg-indigo-600',
    };
  } else if (score >= 40) {
    statusBadge = {
      label: 'Developing',
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      barColor: 'bg-amber-500',
    };
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover-lift flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {courseCode}
            </span>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">{topicName}</h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium">Topic Mastery</span>
            <span className="font-extrabold text-slate-900">{score}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusBadge.barColor}`}
              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>{attemptCount ? `${attemptCount} attempts` : 'No attempts'}</span>
        {onPracticeClick && (
          <button
            onClick={onPracticeClick}
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Practice Topic →
          </button>
        )}
      </div>
    </div>
  );
}
