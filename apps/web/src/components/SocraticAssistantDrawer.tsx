'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Brain,
  HelpCircle,
  Lightbulb,
  Code,
  Send,
  Loader2,
  BookOpen,
  Video,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SocraticAssistantProps {
  questionId: string;
  selectedOptionId: string;
  topicName: string;
  courseCode: string;
  onPracticeSimilar?: (questionId: string) => void;
}

export function SocraticAssistantDrawer({
  questionId,
  selectedOptionId,
  topicName,
  courseCode,
  onPracticeSimilar,
}: SocraticAssistantProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [conversation, setConversation] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (questionId && selectedOptionId) {
      loadSocraticRemediation();
    }
  }, [questionId, selectedOptionId]);

  const loadSocraticRemediation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/socratic/remediation', {
        questionId,
        selectedOptionId,
      });
      setData(res);
      setConversation([
        {
          role: 'ASSISTANT',
          content: `${res.distractorDiagnosis}\n\n${res.socraticPrompt}`,
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Socratic remediation service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: string, customMessage?: string) => {
    if (!data?.conversationId || actionLoading) return;
    setActionLoading(true);

    if (customMessage) {
      setConversation((prev) => [...prev, { role: 'USER', content: customMessage }]);
    }

    try {
      const res = await api.post('/ai/socratic/action', {
        conversationId: data.conversationId,
        actionType,
        userMessage: customMessage || undefined,
      });

      setConversation((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: res.reply,
          metadata: res.metadata,
        },
      ]);
      setUserQuery('');
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          role: 'SYSTEM',
          content: 'Failed to process Socratic request. Please try again.',
        },
      ]);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <span className="text-xs font-semibold text-indigo-200">
          Activating Grounded AI Socratic Tutor for {topicName}...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
        <p className="font-bold text-amber-300">AI Socratic Assistant Note:</p>
        <p className="mt-0.5">{error || 'Review theoretical notes above.'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/95 shadow-2xl overflow-hidden transition-all text-slate-100">
      {/* Header bar */}
      <div className="p-4 bg-gradient-to-r from-indigo-950 via-purple-950/80 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold tracking-tight">AI Socratic Remedial Tutor</h4>
            <span className="text-[10px] text-indigo-300">
              Grounded in CHARUSAT {courseCode} Course Notes
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-200 hover:text-white transition p-1"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Distractor Diagnosis Alert */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 mb-1">Distractor Analysis</p>
              <p>{data.distractorDiagnosis}</p>
            </div>
          </div>

          {/* Socratic Guiding Prompt */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Socratic Reflection</span>
            </div>
            <p className="leading-relaxed font-medium">{data.socraticPrompt}</p>
          </div>

          {/* Interactive Action Chips */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Interactive Socratic Actions
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction('EXPLAIN_SIMPLY')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-white text-xs font-bold shadow-sm transition"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Explain More Simply</span>
              </button>

              <button
                onClick={() => handleAction('REAL_WORLD_EXAMPLE')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-white text-xs font-bold shadow-sm transition"
              >
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span>Show Real-World Example</span>
              </button>

              <button
                onClick={() => handleAction('PRACTICE_SIMILAR')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-white text-xs font-bold shadow-sm transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Practice Similar Problem</span>
              </button>
            </div>
          </div>

          {/* Socratic Conversation Thread */}
          {conversation.length > 1 && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/70 space-y-3 max-h-60 overflow-y-auto">
              {conversation.slice(1).map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'USER'
                      ? 'bg-indigo-600 text-white ml-8 font-medium'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 mr-8 font-normal'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              ))}
              {actionLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking Socratically...</span>
                </div>
              )}
            </div>
          )}

          {/* Ask Follow-Up Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userQuery.trim()) {
                  handleAction('ASK_FOLLOW_UP', userQuery);
                }
              }}
              placeholder={`Ask a follow-up question about ${topicName}...`}
              className="flex-1 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500 font-medium"
            />
            <button
              onClick={() => {
                if (userQuery.trim()) {
                  handleAction('ASK_FOLLOW_UP', userQuery);
                }
              }}
              disabled={!userQuery.trim() || actionLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </div>

          {/* Curated University Learning Materials */}
          {data.recommendedResources && data.recommendedResources.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Curated University Learning Materials
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.recommendedResources.map((res: any) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-indigo-500/50 hover:bg-slate-800/40 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        {res.resourceType === 'VIDEO_WALKTHROUGH' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-400 transition">
                          {res.title}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {res.author} • {res.estimatedMinutes} min
                        </span>
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
