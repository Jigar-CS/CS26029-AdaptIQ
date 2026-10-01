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
  ChevronDown,
  ChevronUp,
  RefreshCw,
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
      const res = await api.post(`/ai/socratic/conversations/${data.conversationId}/message`, {
        actionType,
        userMessage: customMessage || undefined,
      });

      setConversation((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: res.message,
          remedialVideoUrl: res.remedialVideoUrl,
          remedialDocSnippet: res.remedialDocSnippet,
        },
      ]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: 'Sorry, I encountered an issue retrieving further pedagogical guidance.',
        },
      ]);
    } finally {
      setActionLoading(false);
      setUserQuery('');
    }
  };

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || actionLoading) return;
    handleAction('USER_QUESTION', userQuery);
  };

  if (loading) {
    return (
      <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-slate-900/60 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span>Synthesizing Socratic feedback with CHARUSAT curriculum grounding...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
        <p className="font-bold text-amber-900 dark:text-amber-300">AI Socratic Assistant Note:</p>
        <p className="mt-0.5">{error || 'Review theoretical notes above.'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900 shadow-xs dark:shadow-2xl overflow-hidden transition-all text-slate-800 dark:text-slate-100">
      {/* Header bar */}
      <div className="p-4 bg-indigo-50 dark:bg-slate-900 border-b border-indigo-100 dark:border-indigo-500/20 text-slate-900 dark:text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold tracking-tight">AI Socratic Remedial Tutor</h4>
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300">
              Grounded in CHARUSAT {courseCode} Course Notes
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-500 dark:text-indigo-200 hover:text-slate-900 dark:hover:text-white transition p-1"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Distractor Diagnosis Alert */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Distractor Analysis</p>
              <p>{data.distractorDiagnosis}</p>
            </div>
          </div>

          {/* Socratic Guiding Prompt */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
              <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Socratic Reflection</span>
            </div>
            <p className="leading-relaxed font-medium">{data.socraticPrompt}</p>
          </div>

          {/* Interactive Action Chips */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Interactive Socratic Actions
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction('EXPLAIN_SIMPLY')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Explain More Simply</span>
              </button>

              <button
                onClick={() => handleAction('REAL_WORLD_EXAMPLE')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition"
              >
                <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Show Real-World Example</span>
              </button>

              <button
                onClick={() => handleAction('PRACTICE_SIMILAR')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Practice Similar Problem</span>
              </button>
            </div>
          </div>

          {/* Socratic Conversation Thread */}
          {conversation.length > 1 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/70 space-y-3 max-h-60 overflow-y-auto">
              {conversation.slice(1).map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'USER'
                      ? 'bg-indigo-600 text-white ml-8 font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 mr-8 font-normal shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ask your own question */}
          <form onSubmit={handleSendQuery} className="flex gap-2">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask a clarifying question to your tutor..."
              disabled={actionLoading}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={actionLoading || !userQuery.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
