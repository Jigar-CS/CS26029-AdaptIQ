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
  Target,
  Trophy,
  Sliders,
  Flag,
  HelpCircle,
  Send,
  X,
  Lock,
  ShieldAlert,
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
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(5);

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

  // Question tracking & Session Completion states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(1);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<string[]>([]);
  const [sessionScore, setSessionScore] = useState<{ correct: number; total: number; totalTime: number }>({
    correct: 0,
    total: 0,
    totalTime: 0,
  });

  // On-Demand AI Topic Generation states
  const [isCustomTopicMode, setIsCustomTopicMode] = useState<boolean>(false);
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Question Dispute / Flagging States
  const [disputeModalOpen, setDisputeModalOpen] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('WRONG_ANSWER');
  const [disputeComment, setDisputeComment] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [disputedQuestionIds, setDisputedQuestionIds] = useState<string[]>([]);
  const [disputeSuccessMsg, setDisputeSuccessMsg] = useState<string | null>(null);
  const [disputeErrorMsg, setDisputeErrorMsg] = useState<string | null>(null);

  // Navigation Lock during active session
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const isSessionActive = Boolean(activeSession && !sessionCompleted);

  // Trap browser back button and tab close during active practice
  useEffect(() => {
    if (isSessionActive) {
      window.history.pushState(null, '', window.location.href);

      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
        setShowExitConfirmModal(true);
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isSessionActive]);

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
    if (currentQuestion && !attemptResult && !sessionCompleted) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [currentQuestion, attemptResult, sessionCompleted]);

  const [isRemediationMode, setIsRemediationMode] = useState<boolean>(false);

  const loadCourses = async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data);
      if (data.length > 0) {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const queryCourseId = params?.get('courseId');
        const queryTopicId = params?.get('topicId');

        const targetCourse =
          (queryCourseId && data.find((c: any) => c.id === queryCourseId || c.code === queryCourseId)) || data[0];

        setSelectedCourseId(targetCourse.id);

        if (targetCourse.topics?.length > 0) {
          const targetTopic =
            (queryTopicId &&
              targetCourse.topics.find(
                (t: any) => t.id === queryTopicId || t.name.toLowerCase() === queryTopicId.toLowerCase(),
              )) ||
            targetCourse.topics[0];

          setSelectedTopicId(targetTopic.id);
          if (queryTopicId) {
            setIsRemediationMode(true);
          }
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
    setCurrentQuestionIndex(1);
    setSessionCompleted(false);
    setAttemptedQuestionIds([]);
    setSessionScore({ correct: 0, total: 0, totalTime: 0 });

    const targetTopicId = overrideTopicId || selectedTopicId;

    try {
      let firstQ = null;
      let session = null;

      // When manual calibration is active, strictly request the chosen difficulty
      const diffQuery = !adaptiveMode ? `&difficulty=${selectedDifficulty}` : '';

      if (targetTopicId) {
        // Fetch dynamically calibrated or manual difficulty question
        const adaptiveRes = await api.get(
          `/adaptive/next-question?topicId=${targetTopicId}&courseId=${selectedCourseId}${diffQuery}`
        );
        firstQ = adaptiveRes?.question;
        const targetDiff = !adaptiveMode
          ? selectedDifficulty
          : adaptiveRes?.calibration?.recommendedDifficulty || selectedDifficulty;

        // Start session record in DB
        const sessionRes = await api.post('/practice/sessions', {
          courseId: selectedCourseId,
          topicId: targetTopicId || undefined,
          difficulty: targetDiff,
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
      if (firstQ?.id) {
        setAttemptedQuestionIds([firstQ.id]);
      }
    } catch (err) {
      console.error('Failed to start session', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleGenerateAiQuestion = async () => {
    const topicToUse = isCustomTopicMode
      ? customTopicInput.trim()
      : selectedCourse?.topics?.find((t: any) => t.id === selectedTopicId)?.name || 'Arrays';

    if (!topicToUse) return;

    setIsGeneratingAi(true);
    setLoadingQuestion(true);
    setAttemptResult(null);
    setDetectedMisconception(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);
    setCurrentQuestionIndex(1);
    setSessionCompleted(false);
    setAttemptedQuestionIds([]);
    setSessionScore({ correct: 0, total: 0, totalTime: 0 });

    try {
      const res = await api.post('/adaptive/generate-question', {
        topicName: topicToUse,
        courseId: selectedCourseId,
        difficulty: selectedDifficulty,
      });

      if (res?.question) {
        const sessionRes = await api.post('/practice/sessions', {
          courseId: selectedCourseId,
          topicId: res.question.topicId,
          difficulty: selectedDifficulty,
        });

        setActiveSession(sessionRes.session || { id: 'ai-session-' + Date.now() });
        setCurrentQuestion(res.question);
        if (res.question.id) {
          setAttemptedQuestionIds([res.question.id]);
        }
      }
    } catch (err) {
      console.error('Failed to generate AI question', err);
    } finally {
      setIsGeneratingAi(false);
      setLoadingQuestion(false);
    }
  };

  const handleOpenDispute = () => {
    setDisputeModalOpen(true);
    setDisputeReason('WRONG_ANSWER');
    setDisputeComment('');
    setDisputeSuccessMsg(null);
    setDisputeErrorMsg(null);
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion?.id || !disputeComment.trim()) return;

    try {
      setIsSubmittingDispute(true);
      setDisputeErrorMsg(null);
      await api.post('/disputes', {
        questionId: currentQuestion.id,
        practiceSessionId: activeSession?.id || undefined,
        selectedOptionId: selectedOptionId || undefined,
        reasonCategory: disputeReason,
        studentComment: disputeComment.trim(),
      });

      setDisputedQuestionIds((prev) => [...prev, currentQuestion.id]);
      setDisputeSuccessMsg('Dispute submitted! The faculty moderation team has been notified. If upheld, your mastery score will be credited automatically.');

      setTimeout(() => {
        setDisputeModalOpen(false);
        setDisputeSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      console.error('Failed to submit dispute:', err);
      setDisputeErrorMsg(err?.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleConfirmExitSession = () => {
    setActiveSession(null);
    setCurrentQuestion(null);
    setAttemptResult(null);
    setSelectedOptionId(null);
    setSessionCompleted(false);
    setShowExitConfirmModal(false);
    if (selectedTopicId) {
      loadCalibration(selectedTopicId);
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

      setSessionScore((prev) => ({
        correct: prev.correct + (res.isCorrect ? 1 : 0),
        total: prev.total + 1,
        totalTime: prev.totalTime + timerSeconds,
      }));

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

    // Check if target question count has been completed
    if (currentQuestionIndex >= targetQuestionCount) {
      setSessionCompleted(true);
      return;
    }

    setLoadingQuestion(true);
    setAttemptResult(null);
    setDetectedMisconception(null);
    setSelectedOptionId(null);
    setTimerSeconds(0);

    try {
      const excludeQuery = attemptedQuestionIds.length > 0 ? `&excludeIds=${attemptedQuestionIds.join(',')}` : '';
      const diffQuery = !adaptiveMode ? `&difficulty=${selectedDifficulty}` : '';

      if (selectedTopicId) {
        const adaptRes = await api.get(
          `/adaptive/next-question?topicId=${selectedTopicId}&courseId=${selectedCourseId}${diffQuery}${excludeQuery}`
        );
        if (adaptRes?.question) {
          setCurrentQuestion(adaptRes.question);
          setCurrentQuestionIndex((prev) => prev + 1);
          setAttemptedQuestionIds((prev) => [...prev, adaptRes.question.id]);
          if (adaptRes.calibration) {
            setCalibrationData(adaptRes.calibration);
          }
          return;
        }
      }
      const nextQ = await api.get(`/practice/sessions/${activeSession.id}/next-question`);
      if (nextQ) {
        setCurrentQuestion(nextQ);
        setCurrentQuestionIndex((prev) => prev + 1);
        if (nextQ.id) {
          setAttemptedQuestionIds((prev) => [...prev, nextQ.id]);
        }
      } else {
        // No further questions available in current filter
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error('Failed to load next question', err);
      setSessionCompleted(true);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      <Sidebar isLocked={isSessionActive} onLockedClick={() => setShowExitConfirmModal(true)} />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'pl-64' : 'pl-[72px]'}`}>
        <Navbar
          title="Adaptive Practice Lab"
          subtitle="One-question-at-a-time targeted conceptual training"
          isLocked={isSessionActive}
          onLockedClick={() => setShowExitConfirmModal(true)}
        />

        <main className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 p-6 sm:p-8 shadow-xs dark:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    IRT & Bayesian Knowledge Tracing
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Live Dynamic Difficulty
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Adaptive Practice Arena
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                  Personalized conceptual drills calibrated to your real-time mastery. Questions adapt difficulty after every attempt.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSpacedDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-500/40 text-xs font-bold shadow-xs transition self-start md:self-center shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                <span>Spaced Review Queue</span>
              </button>
            </div>
          </div>

          {/* Practice Setup Header / Config Bar */}
          {!activeSession ? (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              {/* Faculty Remediation Nudge Active Banner */}
              {isRemediationMode && (
                <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-300 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                          Faculty Assigned
                        </span>
                        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          Targeted Remediation Practice Session
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Your course instructor dispatched this practice session to strengthen your conceptual grasp on {courses.find((c) => c.id === selectedCourseId)?.topics?.find((t: any) => t.id === selectedTopicId)?.name || 'this topic'}.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartSession()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                  >
                    <span>Launch Session Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Configure Practice Session
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select your target curriculum area and difficulty level. Questions dynamically calibrate to your real-time mastery.
                </p>
              </div>

              {/* Adaptive Calibration preview if topic is selected */}
              {calibrationData && (
                <AdaptiveCalibrationBanner
                  calibration={calibrationData}
                  adaptiveMode={adaptiveMode}
                  selectedDifficulty={selectedDifficulty}
                  onToggleAdaptive={() => setAdaptiveMode(!adaptiveMode)}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Course Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic Selector - Clean, ONLY Topic Name + Custom Topic Mode */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Target Topic
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTopicMode(!isCustomTopicMode)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {isCustomTopicMode ? 'Curriculum List' : 'Custom Topic'}
                    </button>
                  </div>
                  {isCustomTopicMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Red-Black Trees, Dynamic Programming..."
                      value={customTopicInput}
                      onChange={(e) => setCustomTopicInput(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Topics (Curriculum-wide)</option>
                      {selectedCourse?.topics?.map((topic: any) => (
                        <option key={topic.id} value={topic.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Question Count Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Questions To Practice
                  </label>
                  <select
                    value={targetQuestionCount}
                    onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value={5} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">5 Questions (Sprint Drill)</option>
                    <option value={10} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">10 Questions (Standard Practice)</option>
                    <option value={15} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">15 Questions (Deep Drill)</option>
                    <option value={20} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">20 Questions (Intensive Review)</option>
                  </select>
                </div>

                {/* Difficulty Selector with Manual Calibration Option */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Difficulty Level
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdaptiveMode(!adaptiveMode)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {adaptiveMode ? 'Set Manual Tier' : 'Enable Auto-IRT'}
                    </button>
                  </div>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => {
                      setSelectedDifficulty(e.target.value);
                      setAdaptiveMode(false);
                    }}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="EASY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Easy (Level 1: Scaffolding)</option>
                    <option value="MEDIUM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium (Level 2: Analytical)</option>
                    <option value="HARD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Hard (Level 3: Edge-Case Synthesis)</option>
                  </select>
                  {!adaptiveMode ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                      Manual Challenge: Questions will strictly target {selectedDifficulty} tier
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-1">
                      Adaptive Calibration: Calibrated live to your mastery
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAiQuestion}
                  disabled={loadingQuestion || isGeneratingAi}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generate On-Demand AI Question</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  disabled={loadingQuestion || isGeneratingAi}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loadingQuestion && !isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  <span>Begin Standard Session</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Container */
            <div className="space-y-6">
              {/* Session Status Banner */}
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    {currentQuestion?.topicName || selectedCourse?.topics?.find((t: any) => t.id === selectedTopicId)?.name || 'Target Practice'}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Difficulty:{' '}
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                        (currentQuestion?.difficulty || selectedDifficulty) === 'EASY'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : (currentQuestion?.difficulty || selectedDifficulty) === 'MEDIUM'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                          : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      {currentQuestion?.difficulty || selectedDifficulty}
                    </span>
                  </span>
                  {(currentQuestion?.sourceType === 'AI_GENERATED' || currentQuestion?.isAiGenerated) && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      AI Grounded
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Mode:{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {adaptiveMode ? 'Adaptive IRT' : 'Manual Calibrated'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      Question <strong className="text-indigo-600 dark:text-indigo-400">{Math.min(currentQuestionIndex, targetQuestionCount)}</strong> of {targetQuestionCount}
                    </span>
                    <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden ml-1 hidden sm:block">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (currentQuestionIndex / targetQuestionCount) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-mono">{timerSeconds}s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowExitConfirmModal(true)}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exit Session</span>
                  </button>
                </div>
              </div>

              {/* Session Completed or Active Question Card */}
              {sessionCompleted ? (
                /* Session Goal Completed Screen */
                <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 text-center shadow-xs space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Goal Reached
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                      Target Practice Completed!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                      You completed your planned {targetQuestionCount} practice questions in{' '}
                      <strong>{selectedCourse?.topics?.find((t: any) => t.id === selectedTopicId)?.name || 'Target Curriculum'}</strong>.
                    </p>
                  </div>

                  {/* Summary Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Accuracy</div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {sessionScore.correct} of {sessionScore.total} solved correctly
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Difficulty Tier</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {!adaptiveMode ? selectedDifficulty : 'Adaptive IRT'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {!adaptiveMode ? 'User-Calibrated Challenge' : 'Dynamic Ability Matching'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Avg Response Time</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                        {sessionScore.total > 0 ? Math.round(sessionScore.totalTime / sessionScore.total) : 0}s
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">per problem</div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setActiveSession(null);
                        setSessionCompleted(false);
                        if (selectedTopicId) loadCalibration(selectedTopicId);
                      }}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Start New Practice Session</span>
                    </button>
                    <button
                      onClick={() => router.push('/student/dashboard')}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition border border-slate-200 dark:border-slate-700"
                    >
                      View Student Dashboard
                    </button>
                  </div>
                </div>
              ) : currentQuestion ? (
                <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                  {/* Question Stem */}
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">
                      Multiple Choice Question
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
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
                        'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200';

                      if (isSelected && !hasResult) {
                        optionStyle = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-white ring-2 ring-indigo-500/30';
                      }

                      if (isCorrectAnswer) {
                        optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30';
                      } else if (isSelectedWrong) {
                        optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/30';
                      }

                      return (
                        <button
                          key={option.id}
                          disabled={hasResult}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
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
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div
                        className={`p-5 rounded-2xl border ${
                          attemptResult.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {attemptResult.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            )}
                            <h4 className="text-sm font-bold">
                              {attemptResult.isCorrect ? 'Correct Solution!' : 'Incorrect Answer'}
                            </h4>
                          </div>

                          {attemptResult.updatedMastery && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs">
                              New Topic Mastery: {attemptResult.updatedMastery.masteryScore}%
                            </span>
                          )}
                        </div>

                        {/* Stored Database Explanation */}
                        <div className="mt-3 text-xs leading-relaxed space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">Explanation:</p>
                          <p className="text-slate-600 dark:text-slate-300">{attemptResult.explanation}</p>
                        </div>

                        {/* Question Dispute / Flagging Section */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Believe this question has an incorrect answer or flaw?</span>
                          </div>
                          {disputedQuestionIds.includes(currentQuestion.id) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                              <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Reported to Faculty Queue
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenDispute}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 transition shadow-2xs"
                            >
                              <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Dispute / Report Question
                            </button>
                          )}
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
                      {selectedOptionId && !attemptResult.isCorrect && currentQuestion?.id && (
                        <SocraticAssistantDrawer
                          questionId={currentQuestion.id}
                          selectedOptionId={selectedOptionId}
                          topicName={currentQuestion.topicName || 'Computer Science'}
                          courseCode={selectedCourse?.code || 'CS301'}
                          onPracticeSimilar={() => handleNextQuestion()}
                        />
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Session Score: <strong className="text-slate-900 dark:text-white">{attemptResult.sessionStats?.correctAnswers}</strong> / {attemptResult.sessionStats?.questionsAttempted} Correct
                        </span>

                        <button
                          onClick={handleNextQuestion}
                          disabled={loadingQuestion}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
                        >
                          {loadingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          <span>
                            {currentQuestionIndex >= targetQuestionCount ? 'Complete Session' : 'Continue to Next Question'}
                          </span>
                          {currentQuestionIndex >= targetQuestionCount ? (
                            <Trophy className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No more questions available in session */
                <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Practice Session Completed</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    You have practiced all available questions matching this filter criteria. Your mastery and learning curve have been updated!
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveSession(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition border border-slate-200 dark:border-slate-700"
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

      {/* Human-in-the-Loop Question Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report / Dispute Question</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Faculty Review & Automatic Mastery Credit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitDispute} className="p-5 space-y-4 overflow-y-auto">
              {/* Question Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Question Under Review
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-3">
                  {currentQuestion?.questionText}
                </p>
              </div>

              {/* Dispute Reason Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nature of the Issue <span className="text-rose-500">*</span>
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="WRONG_ANSWER">System marked wrong answer (My choice was correct)</option>
                  <option value="AMBIGUOUS_QUESTION">Ambiguous / Multiple valid interpretations</option>
                  <option value="FACTUAL_ERROR">Factual error in explanation or question stem</option>
                  <option value="TYPO_OR_FORMATTING">Typo, formatting, or broken symbols</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>

              {/* Student Argument / Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Reasoning / Correct Solution <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={disputeComment}
                  onChange={(e) => setDisputeComment(e.target.value)}
                  placeholder="Explain why you believe the system's answer was incorrect or how you solved it (e.g. proof, formulas, authoritative reference)..."
                  className="w-full p-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none font-normal"
                  required
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Be specific so faculty can evaluate your argument fairly.
                </p>
              </div>

              {/* Status alerts */}
              {disputeSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{disputeSuccessMsg}</span>
                </div>
              )}

              {disputeErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{disputeErrorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  disabled={isSubmittingDispute}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeComment.trim() || !!disputeSuccessMsg}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
                >
                  {isSubmittingDispute ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit to Faculty Queue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Navigation Guard / Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Active Practice Session in Progress
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Page navigation is locked during active practice mode to preserve focus and session integrity. To visit other sections, you must exit this session first.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition order-1 sm:order-2"
              >
                Continue Practice
              </button>
              <button
                type="button"
                onClick={handleConfirmExitSession}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition order-2 sm:order-1"
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
