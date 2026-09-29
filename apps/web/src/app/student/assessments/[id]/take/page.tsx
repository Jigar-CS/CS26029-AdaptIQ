'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Award,
  BookOpen,
} from 'lucide-react';

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const assessmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOptionId
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [trustScore, setTrustScore] = useState<number>(100);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (assessmentId) {
      startAssessment();
    }
  }, [assessmentId]);

  // Phase 9: Real-Time Browser Integrity Monitoring
  useEffect(() => {
    if (!examData || result) return;

    const handleFocusLoss = () => {
      setTrustScore((prev) => Math.max(0, prev - 10));
      setWarningMessage('INTEGRITY ALERT: Browser focus lost! Window and tab swapping is recorded in your invigilation audit timeline.');

      // Attempt background logging to API if session exists
      if (examData?.submissionId) {
        api.post(`/proctoring/sessions/${examData.submissionId}/violation`, {
          type: 'TAB_SWITCH',
          severity: 'MEDIUM',
          confidence: 0.98,
          details: 'Browser window blur / tab swap detected during active assessment.',
        }).catch(() => {});
      }
    };

    window.addEventListener('blur', handleFocusLoss);
    return () => window.removeEventListener('blur', handleFocusLoss);
  }, [examData, result]);

  const startAssessment = async () => {
    setLoading(true);
    try {
      const data = await api.post(`/assessments/${assessmentId}/start`);
      setExamData(data);
      setSecondsRemaining(data.remainingSeconds || data.assessment.durationMinutes * 60);
    } catch (err: any) {
      alert(err.message || 'Failed to start assessment');
      router.push('/student/assessments');
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!examData || result) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examData, result]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleToggleFlag = (idx: number) => {
    setFlagged((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAutoSubmit = async () => {
    if (submitting || result) return;
    await submitExam();
  };

  const submitExam = async () => {
    if (!examData) return;
    setSubmitting(true);

    const answerPayload = examData.questions.map((q: any) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || null,
      timeSpentSeconds: 30,
    }));

    try {
      const res = await api.post(`/assessments/submissions/${examData.submissionId}/submit`, {
        answers: answerPayload,
      });
      // Fetch full itemized result
      const detailedResult = await api.get(`/assessments/submissions/${examData.submissionId}/result`);
      setResult(detailedResult);
    } catch (err) {
      console.error('Failed to submit exam', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  // Graded Results Screen
  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                result.passed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <Award className="w-8 h-8" />
            </div>

            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
              {result.courseCode} • {result.assessmentCode}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{result.assessmentTitle}</h1>

            <div className="mt-6 flex justify-center gap-6">
              <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">Your Score</span>
                <span className="text-2xl font-black text-white">
                  {result.totalScore} / {result.totalMarks}
                </span>
              </div>
              <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">Percentage</span>
                <span className="text-2xl font-black text-indigo-400">
                  {result.percentage}%
                </span>
              </div>
              <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">Outcome</span>
                <span
                  className={`text-2xl font-black ${
                    result.passed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {result.passed ? 'PASSED' : 'RETAKE'}
                </span>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push('/student/assessments')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Return to Assessments
              </button>
            </div>
          </div>

          {/* Itemized Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Question Itemization & Explanations</h3>
            {result.answers?.map((ans: any, idx: number) => (
              <div
                key={ans.questionId}
                className={`rounded-2xl border p-6 ${
                  ans.isCorrect
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : 'bg-slate-900/90 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">
                    Question {idx + 1} • {ans.topicName}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      ans.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {ans.isCorrect ? `+${ans.pointsAwarded} pts (Correct)` : '0 pts (Incorrect)'}
                  </span>
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed mb-4">
                  {ans.questionText}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block font-medium mb-1">Your Selection:</span>
                    <span className={ans.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {ans.selectedOptionText}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block font-medium mb-1">Correct Solution:</span>
                    <span className="text-emerald-400 font-bold">{ans.correctOptionText}</span>
                  </div>
                </div>

                {ans.explanation && (
                  <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/20 text-xs text-indigo-200">
                    <strong className="text-white block mb-1">Pedagogical Explanation:</strong>
                    {ans.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Assessment Taking Environment
  const qList = examData?.questions || [];
  const currentQ = qList[currentIdx];
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
            Formal Examination Session
          </span>
          <h2 className="text-base font-bold text-white">{examData?.assessment?.title}</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Phase 9: AI Integrity Status */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Integrity Guard</span>
            <span className="text-slate-600">•</span>
            <span className={`font-mono font-bold ${trustScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {trustScore}% Trust
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold ${
              secondsRemaining < 300
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-indigo-300 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <button
            type="button"
            onClick={submitExam}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Phase 9: Active Anomaly Notification Banner */}
      {warningMessage && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-200 px-6 py-2.5 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-rose-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Main taking workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Question area */}
        <div className="lg:col-span-3 space-y-6">
          {currentQ && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-bold text-indigo-400">
                  Question {currentIdx + 1} of {qList.length} • {currentQ.points} Points
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentIdx)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                    flagged[currentIdx]
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {flagged[currentIdx] ? '★ Flagged for Review' : '☆ Flag for Review'}
                </button>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQ.questionText}
              </h3>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options?.map((opt: any, oIdx: number) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-2 ring-indigo-500/30'
                          : 'bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt.optionText}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination controls */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIdx === qList.length - 1}
                  onClick={() => setCurrentIdx((prev) => Math.min(qList.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Question Navigation Palette */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {qList.map((q: any, idx: number) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIdx;
                const isFlag = !!flagged[idx];

                let btnClass = 'bg-slate-800 text-slate-400 border-slate-700';
                if (isAnswered) btnClass = 'bg-indigo-600 text-white border-indigo-500 font-bold';
                if (isFlag) btnClass = 'bg-amber-500/30 text-amber-300 border-amber-500 font-bold';
                if (isCurrent) btnClass += ' ring-2 ring-white';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Answered:</span>
                <strong className="text-white">{answeredCount} / {qList.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Flagged:</span>
                <strong className="text-amber-400">{Object.values(flagged).filter(Boolean).length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
