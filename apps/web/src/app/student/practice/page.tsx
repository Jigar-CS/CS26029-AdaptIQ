'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { SocraticAssistantDrawer } from '@/components/SocraticAssistantDrawer';
import { AdaptiveCalibrationBanner } from '@/components/AdaptiveCalibrationBanner';
import { MisconceptionAlertCard } from '@/components/MisconceptionAlertCard';
import { SpacedRepetitionQueueDrawer } from '@/components/SpacedRepetitionQueueDrawer';
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
  RotateCcw,
} from 'lucide-react';

export default function PracticePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isPinned } = useSidebar();

  // Selection states
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('MEDIUM');

  // Phase 4 Adaptive & Misconception States
  const [calibrationData, setCalibrationData] = useState<any>(null);
  const [adaptiveMode, setAdaptiveMode] = useState<boolean>(true);
  const [detectedMisconception, setDetectedMisconception] = useState<any>(null);
  const [spacedDrawerOpen, setSpacedDrawerOpen] = useState<boolean>(false);

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

  // Load calibration when selected topic changes
  useEffect(() => {
    if (selectedTopicId) {
      loadCalibration(selectedTopicId);
    }
  }, [selectedTopicId]);

  const loadCalibration = async (topicId: string) => {
    try {
      const data = await api.get(`/adaptive/calibration/${topicId}`);
      setCalibrationData(data);
      if (adaptiveMode && data?.recommendedDifficulty) {
        setSelectedDifficulty(data.recommendedDifficulty);
      }
    } catch (err) {
      console.warn('Adaptive calibration unavailable', err);
    }
  };

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

  const handleStartSession = async (overrideTopicId?: string) => {
    setLoadingQuestion(true);
    setAttemptResult(null);
    setDetectedMisconception(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);

    const targetTopicId = overrideTopicId || selectedTopicId;

    try {
      let firstQ = null;
      let session = null;

      if (adaptiveMode && targetTopicId) {
        // Fetch dynamically calibrated adaptive question
        const adaptiveRes = await api.get(`/adaptive/next-question?topicId=${targetTopicId}&courseId=${selectedCourseId}`);
        firstQ = adaptiveRes.question;
        // Start or link session
        const sessionRes = await api.post('/practice/sessions', {
          courseId: selectedCourseId,
          topicId: targetTopicId || undefined,
          difficulty: adaptiveRes.calibration?.recommendedDifficulty || selectedDifficulty,
        });
        session = sessionRes.session;
      } else {
        const res = await api.post('/practice/sessions', {
          courseId: selectedCourseId,
          topicId: targetTopicId || undefined,
          difficulty: selectedDifficulty || undefined,
        });
        session = res.session;
        firstQ = res.firstQuestion;
      }

      setActiveSession(session);
      setCurrentQuestion(firstQ);
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

      // Phase 4: Record attempt with adaptive engine for misconception & spaced repetition updates
      try {
        const adaptiveRecord = await api.post('/adaptive/record-attempt', {
          topicId: currentQuestion.topicId || selectedTopicId,
          selectedOptionId,
          isCorrect: res.isCorrect,
          responseTimeSeconds: timerSeconds,
        });
        if (adaptiveRecord?.misconception?.detected) {
          setDetectedMisconception(adaptiveRecord.misconception);
        }
      } catch (adaptErr) {
        console.warn('Adaptive attempt tracking skipped', adaptErr);
      }
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
    setDetectedMisconception(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);

    try {
      if (adaptiveMode && selectedTopicId) {
        const adaptRes = await api.get(`/adaptive/next-question?topicId=${selectedTopicId}&courseId=${selectedCourseId}`);
        if (adaptRes?.question) {
          setCurrentQuestion(adaptRes.question);
          setCalibrationData(adaptRes.calibration);
          return;
        }
      }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar
          title="Adaptive Practice Lab"
          subtitle="One-question-at-a-time targeted conceptual training"
        />

        <main className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    IRT & Bayesian Knowledge Tracing
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Dynamic Difficulty
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Adaptive Practice Arena
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                  Personalized conceptual drills calibrated to your real-time mastery. Questions adapt difficulty after every attempt.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSpacedDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold shadow-lg transition self-start md:self-center shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-purple-300" />
                <span>Spaced Review Queue</span>
              </button>
            </div>
          </div>

          {/* Practice Setup Header / Config Bar */}
          {!activeSession ? (
            <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  Configure Practice Session
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Select your target curriculum area and difficulty level. Questions dynamically calibrate to your real-time mastery.
                </p>
              </div>

              {/* Adaptive Calibration preview if topic is selected */}
              {calibrationData && (
                <AdaptiveCalibrationBanner
                  calibration={calibrationData}
                  adaptiveMode={adaptiveMode}
                  onToggleAdaptive={() => setAdaptiveMode(!adaptiveMode)}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Course Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                    className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-100"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id} className="bg-slate-900 text-slate-100">
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Target Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-100"
                  >
                    <option value="" className="bg-slate-900 text-slate-100">All Topics (Curriculum-wide)</option>
                    {selectedCourse?.topics?.map((topic: any) => (
                      <option key={topic.id} value={topic.id} className="bg-slate-900 text-slate-100">
                        {topic.name} ({topic._count?.questions || 0} questions)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    disabled={adaptiveMode && !!calibrationData}
                    className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-100 disabled:opacity-60"
                  >
                    <option value="EASY" className="bg-slate-900 text-slate-100">Easy (Foundational)</option>
                    <option value="MEDIUM" className="bg-slate-900 text-slate-100">Medium (Intermediate)</option>
                    <option value="HARD" className="bg-slate-900 text-slate-100">Hard (Advanced Algorithmic)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleStartSession()}
                  disabled={loadingQuestion}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
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
              <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentQuestion?.topicName || 'Practice'}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    Difficulty:{' '}
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                        currentQuestion?.difficulty === 'EASY'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : currentQuestion?.difficulty === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {currentQuestion?.difficulty || 'MEDIUM'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-200 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono">{timerSeconds}s</span>
                  </div>
                  <button
                    onClick={() => setActiveSession(null)}
                    className="text-xs font-bold text-slate-400 hover:text-rose-400 transition"
                  >
                    Exit Session
                  </button>
                </div>
              </div>

              {/* Question Card */}
              {currentQuestion ? (
                <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
                  {/* Question Stem */}
                  <div>
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                      Multiple Choice Question
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white leading-relaxed">
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
                        'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/40 text-slate-200';

                      if (isSelected && !hasResult) {
                        optionStyle = 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/30';
                      }

                      if (isCorrectAnswer) {
                        optionStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold ring-2 ring-emerald-500/30';
                      } else if (isSelectedWrong) {
                        optionStyle = 'border-rose-500 bg-rose-950/40 text-rose-200 font-bold ring-2 ring-rose-500/30';
                      }

                      return (
                        <button
                          key={option.id}
                          disabled={hasResult}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span>{option.optionText}</span>
                          </div>

                          {isCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                          {isSelectedWrong && (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
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
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Submit Answer</span>
                      </button>
                    </div>
                  ) : (
                    /* Explanation & Mastery Impact Box */
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <div
                        className={`p-5 rounded-2xl border ${
                          attemptResult.isCorrect
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {attemptResult.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-400" />
                            )}
                            <h4 className="text-sm font-bold">
                              {attemptResult.isCorrect ? 'Correct Solution!' : 'Incorrect Answer'}
                            </h4>
                          </div>

                          {attemptResult.updatedMastery && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-white shadow-sm">
                              New Topic Mastery: {attemptResult.updatedMastery.masteryScore}%
                            </span>
                          )}
                        </div>

                        {/* Stored Database Explanation */}
                        <div className="mt-3 text-xs leading-relaxed space-y-1">
                          <p className="font-bold text-slate-200">Explanation:</p>
                          <p className="text-slate-300">{attemptResult.explanation}</p>
                        </div>
                      </div>

                      {/* Phase 4: Misconception Distractor Diagnostic Card */}
                      {detectedMisconception && (
                        <MisconceptionAlertCard
                          misconception={detectedMisconception.misconception}
                          occurrenceCount={detectedMisconception.occurrenceCount}
                        />
                      )}

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

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-400">
                          Session Score: <strong className="text-white">{attemptResult.sessionStats?.correctAnswers}</strong> / {attemptResult.sessionStats?.questionsAttempted} Correct
                        </span>

                        <button
                          onClick={handleNextQuestion}
                          disabled={loadingQuestion}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
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
                <div className="bg-slate-900/90 rounded-2xl p-12 border border-slate-800 text-center shadow-2xl space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Practice Session Completed</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    You have practiced all available questions matching this filter criteria. Your mastery and learning curve have been updated!
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveSession(null)}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition border border-slate-700"
                    >
                      Practice Another Topic
                    </button>
                    <button
                      onClick={() => router.push('/student/dashboard')}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
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

      {/* Phase 4: Ebbinghaus Spaced Repetition Queue Drawer */}
      <SpacedRepetitionQueueDrawer
        isOpen={spacedDrawerOpen}
        onClose={() => setSpacedDrawerOpen(false)}
        onSelectTopicForReview={(topicId) => {
          setSelectedTopicId(topicId);
          handleStartSession(topicId);
        }}
      />
    </div>
  );
}
