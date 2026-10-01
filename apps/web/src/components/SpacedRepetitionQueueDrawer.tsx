'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Calendar, Clock, RotateCcw, CheckCircle, AlertCircle, ChevronRight, X } from 'lucide-react';

interface SpacedItem {
  id: string;
  topicId: string;
  topicName: string;
  courseCode: string;
  intervalDays: number;
  easeFactor: number;
  repetitionNumber: number;
  nextReviewDate: string;
  status: 'DUE' | 'UPCOMING' | 'MASTERED';
  isOverdue: boolean;
  daysRemainingOrOverdue: number;
}

interface SpacedRepetitionQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopicForReview: (topicId: string) => void;
}

export function SpacedRepetitionQueueDrawer({
  isOpen,
  onClose,
  onSelectTopicForReview,
}: SpacedRepetitionQueueDrawerProps) {
  const [queue, setQueue] = useState<SpacedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.get('/adaptive/spaced-queue');
      setQueue(data);
    } catch (err) {
      console.error('Failed to load spaced queue', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const dueItems = queue.filter((item) => item.status === 'DUE' || item.isOverdue);
  const upcomingItems = queue.filter((item) => item.status === 'UPCOMING' && !item.isOverdue);
  const masteredItems = queue.filter((item) => item.status === 'MASTERED');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 overflow-hidden transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-100 dark:bg-purple-500/20 p-2 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Spaced Repetition
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  Ebbinghaus SM-2
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review scheduled at optimal memory decay points</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Due Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Due for Review ({dueItems.length})
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Memory retention decaying</span>
            </div>

            {dueItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                🎉 No topics overdue! Your memory retention is on track.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dueItems.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-3.5 transition-all hover:border-rose-300 dark:hover:border-rose-500/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {item.courseCode}
                        </span>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">{item.topicName}</h4>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{item.isOverdue ? 'Overdue' : 'Due today'} • Interval: {item.intervalDays}d</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTopicForReview(item.topicId);
                          onClose();
                        }}
                        className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1 mt-1 flex-shrink-0"
                      >
                        <span>Review</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Upcoming Reviews ({upcomingItems.length})
              </span>
            </div>

            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-xs">{item.topicName}</h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      In {item.daysRemainingOrOverdue} days • Repetition #{item.repetitionNumber}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    EF: {item.easeFactor.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mastered Section */}
          {masteredItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Long-Term Mastered ({masteredItems.length})
                </span>
              </div>

              <div className="space-y-2">
                {masteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/10 p-3 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-xs">{item.topicName}</h4>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400/80 font-medium">
                        Retention interval: {item.intervalDays} days
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Solidified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            CLIAS SM-2 dynamically spaces repetitions to maximize neural retention with minimal review sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
