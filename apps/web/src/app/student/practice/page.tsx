'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { SocraticAssistantDrawer } from '@/components/SocraticAssistantDrawer';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function PracticePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Selection states
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('MEDIUM');

  // Session & Question states
  const [activeSession, setActiveSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadCourses();
    }
  }, [user, authLoading]);

  // Timer effect while viewing active question
  useEffect(() => {
    let interval: any = null;
    if (currentQuestion && !attemptResult) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [currentQuestion, attemptResult]);

  const loadCourses = async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
        if (data[0].topics?.length > 0) {
          setSelectedTopicId(data[0].topics[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const handleStartSession = async () => {
    setLoadingQuestion(true);
    setAttemptResult(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);

    try {
      const res = await api.post('/practice/sessions', {
        courseId: selectedCourseId,
        topicId: selectedTopicId || undefined,
        difficulty: selectedDifficulty || undefined,
      });

      setActiveSession(res.session);
      setCurrentQuestion(res.firstQuestion);
    } catch (err) {
      console.error('Failed to start session', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || !activeSession || !currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/practice/attempt', {
        sessionId: activeSession.id,
        questionId: currentQuestion.id,
        selectedOptionId,
        timeTakenSeconds: timerSeconds,
      });
      setAttemptResult(res);
    } catch (err) {
      console.error('Failed to submit attempt', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!activeSession) return;
    setLoadingQuestion(true);
    setAttemptResult(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);

    try {
      const nextQ = await api.get(`/practice/sessions/${activeSession.id}/next-question`);
      setCurrentQuestion(nextQ);
    } catch (err) {
      console.error('Failed to load next question', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar
          title="Adaptive Practice Lab"
          subtitle="One-question-at-a-time targeted conceptual training"
        />

        <main className="p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Practice Setup Header / Config Bar */}
          {!activeSession ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  Configure Practice Session
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select your target curriculum area and difficulty level. Questions adapt to your responses.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Course Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      const course = courses.find((c) => c.id === e.target.value);
                      if (course && course.topics?.length > 0) {
                        setSelectedTopicId(course.topics[0].id);
                      } else {
                        setSelectedTopicId('');
                      }
                    }}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
                  >
                    <option value="">All Topics (Mixed)</option>
                    {selectedCourse?.topics?.map((topic: any) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name} ({topic._count?.questions || 0} questions)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
                  >
                    <option value="EASY">Easy (Foundational)</option>
                    <option value="MEDIUM">Medium (Intermediate)</option>
                    <option value="HARD">Hard (Advanced Algorithmic)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStartSession}
                  disabled={loadingQuestion}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
                >
                  {loadingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  <span>Begin Practice Session</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Container */
            <div className="space-y-6">
              {/* Session Status Banner */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentQuestion?.topicName || 'Practice'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Difficulty: <strong className="text-slate-800">{currentQuestion?.difficulty}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{timerSeconds}s</span>
                  </div>
                  <button
                    onClick={() => setActiveSession(null)}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600 transition"
                  >
                    Exit Session
                  </button>
                </div>
              </div>

              {/* Question Card */}
              {currentQuestion ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
                  {/* Question Stem */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Multiple Choice Question
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-relaxed">
                      {currentQuestion.questionText}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option: any, index: number) => {
                      const isSelected = selectedOptionId === option.id;
                      const hasResult = !!attemptResult;
                      const isCorrectAnswer = hasResult && option.id === attemptResult.correctOptionId;
                      const isSelectedWrong = hasResult && isSelected && !attemptResult.isCorrect;

                      let optionStyle =
                        'border-slate-200 bg-white hover:border-indigo-400 text-slate-700';

                      if (isSelected && !hasResult) {
                        optionStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20';
                      }

                      if (isCorrectAnswer) {
                        optionStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-2 ring-emerald-500/30';
                      } else if (isSelectedWrong) {
                        optionStyle = 'border-rose-500 bg-rose-50/80 text-rose-950 ring-2 ring-rose-500/30';
                      }

                      return (
                        <button
                          key={option.id}
                          disabled={hasResult}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span>{option.optionText}</span>
                          </div>

                          {isCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isSelectedWrong && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission and Feedback Area */}
                  {!attemptResult ? (
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedOptionId || isSubmitting}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Submit Answer</span>
                      </button>
                    </div>
                  ) : (
                    /* Explanation & Mastery Impact Box */
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div
                        className={`p-5 rounded-2xl border ${
                          attemptResult.isCorrect
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50/90 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {attemptResult.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-600" />
                            )}
                            <h4 className="text-sm font-bold">
                              {attemptResult.isCorrect ? 'Correct Solution!' : 'Incorrect Answer'}
                            </h4>
                          </div>

                          {attemptResult.updatedMastery && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 shadow-sm">
                              New Topic Mastery: {attemptResult.updatedMastery.masteryScore}%
                            </span>
                          )}
                        </div>

                        {/* Stored Database Explanation */}
                        <div className="mt-3 text-xs leading-relaxed space-y-1">
                          <p className="font-bold text-slate-800">Explanation:</p>
                          <p className="text-slate-700">{attemptResult.explanation}</p>
                        </div>
                      </div>

                      {/* Phase 3: AI Socratic Remediation Assistant */}
                      {selectedOptionId && (
                        <SocraticAssistantDrawer
                          questionId={currentQuestion.id}
                          selectedOptionId={selectedOptionId}
                          topicName={currentQuestion.topicName || 'Computer Science'}
                          courseCode={selectedCourse?.code || 'CS301'}
                          onPracticeSimilar={() => handleNextQuestion()}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Session Score: <strong>{attemptResult.sessionStats?.correctAnswers}</strong> / {attemptResult.sessionStats?.questionsAttempted} Correct
                        </span>

                        <button
                          onClick={handleNextQuestion}
                          disabled={loadingQuestion}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg transition"
                        >
                          {loadingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          <span>Continue to Next Question</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No more questions available in session */
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Practice Session Completed</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    You have practiced all available questions matching this filter criteria. Your mastery and learning curve have been updated!
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveSession(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                    >
                      Practice Another Topic
                    </button>
                    <button
                      onClick={() => router.push('/student/dashboard')}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      View Dashboard Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
