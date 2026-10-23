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
import Link from 'next/link';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
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

  // Post-Session Question Review & Explanation states
  interface QuestionAttemptSummary {
    questionNumber: number;
    questionId: string;
    questionText: string;
    topicName?: string;
    difficulty?: string;
    selectedOptionText: string;
    correctOptionText: string;
    isCorrect: boolean;
    explanation: string;
    timeTakenSeconds: number;
  }
  const [sessionAttemptSummaries, setSessionAttemptSummaries] = useState<QuestionAttemptSummary[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<'WRONG' | 'ALL'>('WRONG');

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

  // Error & Prerequisite Block states
  const [prerequisiteError, setPrerequisiteError] = useState<{
    message: string;
    topicName?: string;
    readinessScore?: number;
    missingPrerequisites?: Array<{
      prerequisiteSlug: string;
      prerequisiteName: string;
      currentMastery: number;
      requiredMastery: number;
      deficit: number;
    }>;
  } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [isRemediationMode, setIsRemediationMode] = useState<boolean>(false);
  const [isLearningPathDrillMode, setIsLearningPathDrillMode] = useState<boolean>(false);
  const [isPlacementMode, setIsPlacementMode] = useState<boolean>(false);
  const [unlockedTopicIds, setUnlockedTopicIds] = useState<Set<string>>(new Set());
  const [knowledgeGraphNodes, setKnowledgeGraphNodes] = useState<any[]>([]);
  const [autoCalibratedNotice, setAutoCalibratedNotice] = useState<{
    requestedTopicName: string;
    prereqTopicName: string;
    prereqTopicId: string;
    reason: string;
  } | null>(null);

  const loadCourseKnowledgeGraph = async (course: any): Promise<{ nodes: any[]; unlocked: Set<string> }> => {
    try {
      const kgRes = await api.get(`/analytics/student/me/knowledge-graph?courseCode=${course.code}`);
      if (kgRes?.nodes) {
        setKnowledgeGraphNodes(kgRes.nodes);
        const unlocked = new Set<string>();
        kgRes.nodes.forEach((n: any) => {
          if (n.isPrerequisiteSatisfied || n.status === 'READY_FOR_PRACTICE' || n.status === 'MASTERED') {
            unlocked.add(n.id);
          }
        });
        setUnlockedTopicIds(unlocked);
        return { nodes: kgRes.nodes, unlocked };
      }
    } catch (err) {
      console.warn('Failed to load course knowledge graph', err);
    }
    return { nodes: [], unlocked: new Set<string>() };
  };

  const loadCourses = async () => {
    try {
      const data = await api.get('/courses');
      setCourses(data);
      if (data.length > 0) {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const queryCourseId = params?.get('courseId');
        const queryCourseCode = params?.get('courseCode');
        const queryTopicId = params?.get('topicId');
        const queryTopicSlug = params?.get('topicSlug');
        const queryTopicQuery = params?.get('topicQuery');
        const fromLearningPath = params?.get('from') === 'learning-path';
        const fromPlacement = params?.get('from') === 'placement';

        if (fromPlacement) {
          setIsPlacementMode(true);
        }

        let targetCourse =
          (queryCourseId && data.find((c: any) => c.id === queryCourseId || c.code.toLowerCase() === queryCourseId.toLowerCase())) ||
          (queryCourseCode && data.find((c: any) => c.code.toLowerCase() === queryCourseCode.toLowerCase())) ||
          null;

        // If from placement or queryTopicQuery, find which course owns this topic if targetCourse wasn't matched
        if (!targetCourse && (queryTopicQuery || queryTopicSlug || queryTopicId)) {
          const searchVal = (queryTopicQuery || queryTopicSlug || queryTopicId || '').toLowerCase();
          for (const c of data) {
            const hasTopic = c.topics?.some((t: any) =>
              t.id === queryTopicId ||
              t.slug?.toLowerCase() === searchVal ||
              t.name?.toLowerCase().includes(searchVal) ||
              searchVal.includes(t.name?.toLowerCase())
            );
            if (hasTopic) {
              targetCourse = c;
              break;
            }
          }
        }

        if (!targetCourse) {
          targetCourse = data[0];
        }

        setSelectedCourseId(targetCourse.id);

        // Fetch course knowledge graph to determine prerequisite fulfillment
        const { nodes: kgNodes, unlocked: unlockedIds } = await loadCourseKnowledgeGraph(targetCourse);

        let targetTopic = null;
        if (targetCourse.topics?.length > 0) {
          // Find matching topic requested
          if (queryTopicId) {
            targetTopic = targetCourse.topics.find((t: any) => t.id === queryTopicId || t.slug === queryTopicId);
          }
          if (!targetTopic && queryTopicSlug) {
            targetTopic = targetCourse.topics.find((t: any) => t.slug === queryTopicSlug);
          }
          if (!targetTopic && queryTopicQuery) {
            const qLower = queryTopicQuery.toLowerCase().trim();
            targetTopic = targetCourse.topics.find((t: any) =>
              t.name.toLowerCase() === qLower ||
              t.slug.toLowerCase() === qLower ||
              t.name.toLowerCase().includes(qLower) ||
              qLower.includes(t.name.toLowerCase()) ||
              t.slug.toLowerCase().includes(qLower)
            );
          }
          if (!targetTopic) {
            // Default to first unlocked topic
            targetTopic = targetCourse.topics.find((t: any) => unlockedIds.has(t.id)) || targetCourse.topics[0];
          }

          if (targetTopic) {
            // Check if this topic has unmet prerequisites!
            const node = kgNodes.find((n: any) => n.id === targetTopic.id || n.slug === targetTopic.slug);
            if (node && !node.isPrerequisiteSatisfied) {
              // Prerequisites NOT cleared!
              // Automatically calibrate to the prerequisite!
              let prereqTopic = null;
              const missing = node.missingPrerequisites?.[0];
              if (missing) {
                prereqTopic = targetCourse.topics.find((t: any) =>
                  t.slug === missing.prerequisiteSlug ||
                  t.slug?.includes(missing.prerequisiteSlug) ||
                  missing.prerequisiteSlug?.includes(t.slug) ||
                  t.name.toLowerCase().includes(missing.prerequisiteName.toLowerCase())
                );
              }
              if (!prereqTopic && node.prerequisites?.length > 0) {
                const firstPrereq = node.prerequisites[0];
                prereqTopic = targetCourse.topics.find((t: any) =>
                  t.name === firstPrereq || t.slug === firstPrereq
                );
              }
              if (!prereqTopic) {
                prereqTopic = targetCourse.topics.find((t: any) => unlockedIds.has(t.id)) || targetCourse.topics[0];
              }

              if (prereqTopic) {
                setSelectedTopicId(prereqTopic.id);
                setIsCustomTopicMode(false);
                loadCalibration(prereqTopic.id);
                setAutoCalibratedNotice({
                  requestedTopicName: targetTopic.name,
                  prereqTopicName: prereqTopic.name,
                  prereqTopicId: prereqTopic.id,
                  reason: missing
                    ? `Prerequisite topic "${missing.prerequisiteName}" requires ${missing.requiredMastery}% mastery (current: ${missing.currentMastery}%). Practice has been automatically calibrated to "${prereqTopic.name}".`
                    : `Prerequisites for "${targetTopic.name}" are not yet cleared. Practice has been automatically calibrated to "${prereqTopic.name}".`,
                });
              }
            } else {
              // Prerequisites cleared!
              setSelectedTopicId(targetTopic.id);
              setIsCustomTopicMode(false);
              loadCalibration(targetTopic.id);
              setAutoCalibratedNotice(null);
            }
          }

          if (fromLearningPath) {
            setIsLearningPathDrillMode(true);
            setIsRemediationMode(false);
          } else if (queryTopicId && !fromPlacement) {
            setIsRemediationMode(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const handleStartSession = async (overrideTopicId?: string, overrideCourseId?: string) => {
    setLoadingQuestion(true);
    setAttemptResult(null);
    setDetectedMisconception(null);
    setSelectedOptionId(null);
    setPrerequisiteError(null);
    setSessionError(null);
    setTimerSeconds(0);
    setCurrentQuestionIndex(1);
    setSessionCompleted(false);
    setAttemptedQuestionIds([]);
    setSessionScore({ correct: 0, total: 0, totalTime: 0 });
    setSessionAttemptSummaries([]);
    setSummaryFilter('WRONG');

    const targetCourseId = overrideCourseId || selectedCourseId;
    const targetTopicId = overrideTopicId || selectedTopicId;

    // Prerequisite guard: if topic is locked, block starting session
    if (unlockedTopicIds.size > 0 && targetTopicId && !unlockedTopicIds.has(targetTopicId)) {
      const course = courses.find((c) => c.id === targetCourseId);
      const topic = course?.topics?.find((t: any) => t.id === targetTopicId);
      const node = knowledgeGraphNodes.find((n: any) => n.id === targetTopicId || n.slug === topic?.slug);
      setPrerequisiteError({
        message: `You cannot practice "${topic?.name || 'this topic'}" until all foundational prerequisites are cleared.`,
        topicName: topic?.name,
        readinessScore: 0,
        missingPrerequisites: node?.missingPrerequisites || [],
      });
      setLoadingQuestion(false);
      return;
    }

    try {
      let firstQ = null;
      let session = null;

      // When manual calibration is active, strictly request the chosen difficulty
      const diffQuery = !adaptiveMode ? `&difficulty=${selectedDifficulty}` : '';

      if (targetTopicId) {
        // Fetch dynamically calibrated or manual difficulty question
        const adaptiveRes = await api.get(
          `/adaptive/next-question?topicId=${targetTopicId}&courseId=${targetCourseId}${diffQuery}`
        );
        firstQ = adaptiveRes?.question;
        const targetDiff = !adaptiveMode
          ? selectedDifficulty
          : adaptiveRes?.calibration?.recommendedDifficulty || selectedDifficulty;

        // Start session record in DB
        const sessionRes = await api.post('/practice/sessions', {
          courseId: targetCourseId,
          topicId: targetTopicId || undefined,
          difficulty: targetDiff,
        });
        session = sessionRes.session;
      } else {
        const res = await api.post('/practice/sessions', {
          courseId: targetCourseId,
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
    } catch (err: any) {
      console.error('Failed to start session', err);
      const resData = err?.response?.data || err?.data || err;
      if (
        resData?.error === 'PREREQUISITE_INCOMPLETE' ||
        resData?.statusCode === 403 ||
        err?.status === 403
      ) {
        const course = courses.find((c) => c.id === targetCourseId);
        const topic = course?.topics?.find((t: any) => t.id === targetTopicId);
        setPrerequisiteError({
          message: resData.message || 'Prerequisites are not yet satisfied for this topic.',
          topicName: resData.topicName || topic?.name,
          readinessScore: resData.readinessScore,
          missingPrerequisites: resData.missingPrerequisites || [],
        });
      } else {
        setSessionError(resData?.message || 'Failed to start practice session. Please try again.');
      }
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
    setSessionAttemptSummaries([]);
    setSummaryFilter('WRONG');

    try {
      const res = await api.post('/adaptive/generate-question', {
        topicName: topicToUse,
        courseId: selectedCourseId,
        difficulty: selectedDifficulty,
      });

      if (res?.question) {
        if (res.question.topicId) {
          setSelectedTopicId(res.question.topicId);
        }
        const sessionRes = await api.post('/practice/sessions', {
          courseId: selectedCourseId,
          topicId: res.question.topicId,
          difficulty: selectedDifficulty,
        });

        setActiveSession(
          sessionRes.session || { id: 'ai-session-' + Date.now(), topicId: res.question.topicId }
        );
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
    setSessionAttemptSummaries([]);
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

      // Record full attempt detail for post-session conceptual review & explanation
      const selectedOpt = currentQuestion.options?.find((opt: any) => opt.id === selectedOptionId);
      const correctOpt = currentQuestion.options?.find((opt: any) => opt.id === res.correctOptionId);

      const summaryItem: QuestionAttemptSummary = {
        questionNumber: currentQuestionIndex,
        questionId: currentQuestion.id,
        questionText: currentQuestion.questionText,
        topicName:
          currentQuestion.topicName ||
          selectedCourse?.topics?.find((t: any) => t.id === selectedTopicId)?.name ||
          'Target Practice',
        difficulty: currentQuestion.difficulty || selectedDifficulty,
        selectedOptionText: selectedOpt?.optionText || 'Option Selected',
        correctOptionText: correctOpt?.optionText || 'Correct Option',
        isCorrect: res.isCorrect,
        explanation: res.explanation || currentQuestion.explanation || 'Detailed explanation provided.',
        timeTakenSeconds: timerSeconds,
      };

      setSessionAttemptSummaries((prev) => [...prev, summaryItem]);

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

      const effectiveTopicId = selectedTopicId || activeSession?.topicId;
      const sessionQuery = activeSession?.id ? `&sessionId=${activeSession.id}` : '';
      const topicQuery = effectiveTopicId ? `&topicId=${effectiveTopicId}` : '';

      // Primary: Adaptive Engine (queries unattempted DB questions, dedupes, or triggers Gemini/Groq on-demand)
      const adaptRes = await api.get(
        `/adaptive/next-question?courseId=${selectedCourseId}${topicQuery}${diffQuery}${excludeQuery}${sessionQuery}`
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

      // Secondary fallback: Practice session bank
      const nextQ = await api.get(`/practice/sessions/${activeSession.id}/next-question`);
      if (nextQ) {
        setCurrentQuestion(nextQ);
        setCurrentQuestionIndex((prev) => prev + 1);
        if (nextQ.id) {
          setAttemptedQuestionIds((prev) => [...prev, nextQ.id]);
        }
      } else {
        // No further questions available
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
    <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex font-sans relative z-10">
      <Sidebar isLocked={isSessionActive} onLockedClick={() => setShowExitConfirmModal(true)} />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPinned ? 'lg:pl-64' : 'lg:pl-[72px]'} pl-0`}>
        <Navbar
          title="Adaptive Practice Lab"
          subtitle="One-question-at-a-time targeted conceptual training"
          isLocked={isSessionActive}
          onLockedClick={() => setShowExitConfirmModal(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Gleam-Spark Page Intro */}
          <div className="page-intro">
            <div>
              <p className="mono text-[#4a6fa5] dark:text-[#6a90c5] tracking-widest text-xs font-semibold uppercase mb-2">
                LEARNING INTELLIGENCE / PRACTICE ARENA / 01
              </p>
              <h1 className="page-title font-display text-5xl sm:text-6xl text-[#1a2540] dark:text-[#f5f0e8] uppercase tracking-tight">
                ADAPTIVE PRACTICE
              </h1>
            </div>
            <div className="readiness">
              <p className="mono text-xs font-semibold uppercase tracking-wider text-[#6b7fa3]">ADAPTIVE ENGINE</p>
              <strong className="font-display text-4xl text-[#1a2540] dark:text-[#f5f0e8]">
                IRT<span className="font-mono text-sm text-[#e05033]">+BKT</span>
              </strong>
              <p className="mono text-xs font-semibold text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider">REAL-TIME CALIBRATION</p>
            </div>
          </div>

          {/* Gleam-Spark 4-Column Metric Band */}
          <div className="metrics">
            <div className="metric">
              <div className="metric-top mono"><span>01</span><span className="text-[#e05033]">ACTIVE</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{targetQuestionCount} Qs</div>
              <div className="metric-label mono">SESSION BUDGET</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>02</span><span className="text-[#e05033]">{adaptiveMode ? 'AUTO' : 'MANUAL'}</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{selectedDifficulty}</div>
              <div className="metric-label mono">DIFFICULTY TIER</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>03</span><span>BAYESIAN</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">{courses.length}</div>
              <div className="metric-label mono">COURSES ENROLLED</div>
            </div>
            <div className="metric">
              <div className="metric-top mono"><span>04</span><span className="text-[#4a6fa5]">CHARUSAT</span></div>
              <div className="metric-value font-display text-2xl sm:text-3xl">SYLLABUS</div>
              <div className="metric-label mono">CURRICULUM ALIGNED</div>
            </div>
          </div>

          {/* Gleam-Spark Priority Band */}
          <div className="priority-band">
            <div className="priority-symbol">!</div>
            <div className="priority-content">
              <h2 className="font-display text-xl uppercase tracking-wide">REINFORCE TARGETED WEAK CONCEPTS</h2>
              <p className="text-xs sm:text-sm text-[#8ba0c0] font-sans">
                Personalized conceptual drills dynamically calibrate difficulty after every attempt using Item Response Theory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSpacedDrawerOpen(true)}
              className="action-button bg-[#e05033] hover:bg-[#c93f24] text-white shrink-0"
              style={{ borderRadius: 0 }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              <span>SPACED QUEUE</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </button>
          </div>

          {/* Practice Setup Header / Config Bar */}
          {!activeSession ? (
            <div className="panel p-6 sm:p-8 space-y-6">
              {/* Back to Learning Path Shortcut */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <Link
                  href={`/student/learning-path?courseCode=${selectedCourse?.code || 'CS301'}`}
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#4a6fa5] dark:text-[#6a90c5] hover:text-[#e05033] transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Learning Path</span>
                </Link>
                {selectedCourse && (
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedCourse.code} • {selectedCourse.name}
                  </span>
                )}
              </div>

              {/* Prerequisite Incomplete Error Alert Card */}
              {prerequisiteError && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <span>Topic Locked by Prerequisite Policy</span>
                        {prerequisiteError.topicName && (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold font-mono">
                            {prerequisiteError.topicName}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {prerequisiteError.message}
                      </p>
                    </div>
                  </div>

                  {prerequisiteError.missingPrerequisites && prerequisiteError.missingPrerequisites.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                        Required Foundations:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prerequisiteError.missingPrerequisites.map((prereq) => (
                          <div
                            key={prereq.prerequisiteSlug}
                            className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-amber-500/20 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{prereq.prerequisiteName}</div>
                              <div className="text-xs text-slate-500">
                                Current: <strong className="text-amber-600">{prereq.currentMastery}%</strong> / Req: {prereq.requiredMastery}%
                              </div>
                            </div>
                            <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                              -{prereq.deficit}% Gap
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/student/learning-path?courseCode=${selectedCourse?.code || 'CS301'}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Learning Path DAG</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPrerequisiteError(null)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                    >
                      Select Different Topic
                    </button>
                  </div>
                </div>
              )}

              {/* General Session Error */}
              {sessionError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between text-xs font-medium">
                  <span>{sessionError}</span>
                  <button onClick={() => setSessionError(null)} className="text-rose-400 hover:text-rose-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Learning Path Concept Drill Pre-Configuration Banner */}
              {isLearningPathDrillMode && (
                <div className="p-4 bg-indigo-50/95 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
                          Learning Path Drill
                        </span>
                        <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Targeted Concept: {courses.find((c) => c.id === selectedCourseId)?.topics?.find((t: any) => t.id === selectedTopicId)?.name || 'Selected Concept'} ({courses.find((c) => c.id === selectedCourseId)?.code || 'Course'})
                        </h4>
                      </div>
                      
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartSession()}
                    disabled={loadingQuestion}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 disabled:opacity-50"
                  >
                    {loadingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    <span>Begin Standard Session</span>
                  </button>
                </div>
              )}

              {/* Faculty Remediation Nudge Active Banner */}
              {isRemediationMode && !isLearningPathDrillMode && (
                <div className="p-4 bg-blue-50/95 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                          Faculty Assigned
                        </span>
                        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          Targeted Remediation Practice Session
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
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

              {/* Placement Readiness Bridge Gap Banner */}
              {isPlacementMode && (
                <div className="p-4 bg-emerald-50/95 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      💼
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                          Placement Bridge Gap
                        </span>
                        <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Target Competency Adaptive Drill
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
                        Calibrating adaptive practice to close verified skill gaps for your chosen career benchmark.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prerequisite Auto-Calibration Alert Card */}
              {autoCalibratedNotice && (
                <div className="p-4.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/25 text-amber-800 dark:text-amber-200 font-extrabold uppercase tracking-wider">
                          Prerequisite Incomplete
                        </span>
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                          Auto-Calibrated to Required Foundation: {autoCalibratedNotice.prereqTopicName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                        {autoCalibratedNotice.reason}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoCalibratedNotice(null)}
                    className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white p-1"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <h2 className="font-display text-2xl uppercase tracking-wide text-[#1a2540] dark:text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-[#e05033]" />
                  CONFIGURE PRACTICE SESSION
                </h2>
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
                  <label className="block font-mono text-xs text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider mb-2 font-bold">
                    Select Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={async (e) => {
                      const newCourseId = e.target.value;
                      setSelectedCourseId(newCourseId);
                      const course = courses.find((c) => c.id === newCourseId);
                      if (course && course.topics?.length > 0) {
                        const { nodes, unlocked } = await loadCourseKnowledgeGraph(course);
                        const firstUnlocked = course.topics.find((t: any) => unlocked.has(t.id)) || course.topics[0];
                        setSelectedTopicId(firstUnlocked.id);
                        setAutoCalibratedNotice(null);
                        loadCalibration(firstUnlocked.id);
                      } else {
                        setSelectedTopicId('');
                        setAutoCalibratedNotice(null);
                      }
                    }}
                    className="w-full p-3 font-mono text-xs sm:text-sm bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[#e05033] text-[#1a2540] dark:text-[#e8edf5]"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id} className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic Selector - Clean, ONLY Unlocked Topics + Custom Topic Mode */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-mono text-xs text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider font-bold">
                      Target Topic
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTopicMode(!isCustomTopicMode)}
                      className="font-mono text-xs text-[#e05033] hover:underline flex items-center gap-1 uppercase font-semibold"
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
                      className="w-full p-3 font-mono text-xs sm:text-sm bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[#e05033] text-[#1a2540] dark:text-[#e8edf5]"
                    />
                  ) : (
                    <>
                      <select
                        value={selectedTopicId}
                        onChange={(e) => {
                          const newTopicId = e.target.value;
                          const topic = selectedCourse?.topics?.find((t: any) => t.id === newTopicId);
                          if (!topic) {
                            setSelectedTopicId(newTopicId);
                            setAutoCalibratedNotice(null);
                            return;
                          }
                          const node = knowledgeGraphNodes.find((n: any) => n.id === topic.id || n.slug === topic.slug);
                          if (node && !node.isPrerequisiteSatisfied) {
                            let prereqTopic = null;
                            const missing = node.missingPrerequisites?.[0];
                            if (missing) {
                              prereqTopic = selectedCourse?.topics?.find((t: any) =>
                                t.slug === missing.prerequisiteSlug ||
                                t.slug?.includes(missing.prerequisiteSlug) ||
                                missing.prerequisiteSlug?.includes(t.slug) ||
                                t.name.toLowerCase().includes(missing.prerequisiteName.toLowerCase())
                              );
                            }
                            if (!prereqTopic && node.prerequisites?.length > 0) {
                              const firstPrereq = node.prerequisites[0];
                              prereqTopic = selectedCourse?.topics?.find((t: any) =>
                                t.name === firstPrereq || t.slug === firstPrereq
                              );
                            }
                            if (!prereqTopic) {
                              prereqTopic = selectedCourse?.topics?.find((t: any) => unlockedTopicIds.has(t.id)) || selectedCourse?.topics?.[0];
                            }
                            if (prereqTopic) {
                              setSelectedTopicId(prereqTopic.id);
                              loadCalibration(prereqTopic.id);
                              setAutoCalibratedNotice({
                                requestedTopicName: topic.name,
                                prereqTopicName: prereqTopic.name,
                                prereqTopicId: prereqTopic.id,
                                reason: missing
                                  ? `Topic "${topic.name}" requires foundation in "${missing.prerequisiteName}" (${missing.requiredMastery}% required). Calibration has been automatically set to "${prereqTopic.name}".`
                                  : `Prerequisites for "${topic.name}" are not cleared. Calibration has been automatically set to "${prereqTopic.name}".`,
                              });
                              return;
                            }
                          }
                          setSelectedTopicId(newTopicId);
                          setAutoCalibratedNotice(null);
                          loadCalibration(newTopicId);
                        }}
                        className="w-full p-3 font-mono text-xs sm:text-sm bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[#e05033] text-[#1a2540] dark:text-[#e8edf5]"
                      >
                        <option value="" className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">
                          All Topics (Curriculum-wide)
                        </option>
                        {selectedCourse?.topics?.map((topic: any) => {
                          const isUnlocked =
                            unlockedTopicIds.size === 0 ||
                            unlockedTopicIds.has(topic.id) ||
                            topic.id === selectedTopicId;
                          return (
                            <option
                              key={topic.id}
                              value={topic.id}
                              disabled={!isUnlocked}
                              className={`bg-[var(--background)] ${
                                !isUnlocked
                                  ? 'text-slate-400 dark:text-slate-600 italic'
                                  : 'text-[#1a2540] dark:text-[#e8edf5]'
                              }`}
                            >
                              {isUnlocked ? topic.name : `🔒 ${topic.name} (Prerequisite Required)`}
                            </option>
                          );
                        })}
                      </select>
                      {unlockedTopicIds.size > 0 && (
                        <span className="font-mono text-[10px] text-[#4a6fa5] dark:text-[#6a90c5] font-semibold block mt-1 uppercase">
                          {unlockedTopicIds.size} topics unlocked. Locked topics require prerequisite completion.
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Question Count Selector */}
                <div>
                  <label className="block font-mono text-xs text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider mb-2 font-bold">
                    Questions To Practice
                  </label>
                  <select
                    value={targetQuestionCount}
                    onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                    className="w-full p-3 font-mono text-xs sm:text-sm bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[#e05033] text-[#1a2540] dark:text-[#e8edf5]"
                  >
                    <option value={5} className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">5 Questions (Sprint Drill)</option>
                    <option value={10} className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">10 Questions (Standard Practice)</option>
                    <option value={15} className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">15 Questions (Deep Drill)</option>
                    <option value={20} className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">20 Questions (Intensive Review)</option>
                  </select>
                </div>

                {/* Difficulty Selector with Manual Calibration Option */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-mono text-xs text-[#4a6fa5] dark:text-[#6a90c5] uppercase tracking-wider font-bold">
                      Difficulty Level
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdaptiveMode(!adaptiveMode)}
                      className="font-mono text-xs text-[#e05033] hover:underline uppercase font-semibold"
                    >
                      {adaptiveMode ? 'Manual Tier' : 'Auto-IRT'}
                    </button>
                  </div>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => {
                      setSelectedDifficulty(e.target.value);
                      setAdaptiveMode(false);
                    }}
                    className="w-full p-3 font-mono text-xs sm:text-sm bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[#e05033] text-[#1a2540] dark:text-[#e8edf5]"
                  >
                    <option value="EASY" className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">Easy (Level 1: Scaffolding)</option>
                    <option value="MEDIUM" className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">Medium (Level 2: Analytical)</option>
                    <option value="HARD" className="bg-[var(--background)] text-[#1a2540] dark:text-[#e8edf5]">Hard (Level 3: Edge-Case Synthesis)</option>
                  </select>
                  {!adaptiveMode ? (
                    <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold block mt-1 uppercase">
                      Manual: Strictly targeting {selectedDifficulty} tier
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-[#4a6fa5] dark:text-[#6a90c5] font-semibold block mt-1 uppercase">
                      Adaptive Calibration: Calibrated live to your mastery
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAiQuestion}
                  disabled={loadingQuestion || isGeneratingAi}
                  className="action-button bg-transparent border border-[var(--strong-border)] text-[#1a2540] dark:text-white hover:bg-[var(--accent)] transition disabled:opacity-50"
                >
                  {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 text-[#e05033] mr-2" />}
                  <span>Generate AI Question</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  disabled={loadingQuestion || isGeneratingAi}
                  className="action-button bg-[#e05033] text-white hover:bg-[#c93f24] transition disabled:opacity-50"
                >
                  {loadingQuestion && !isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <BrainCircuit className="w-3.5 h-3.5 mr-2" />}
                  <span>START PRACTICE →</span>
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
                      className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${(currentQuestion?.difficulty || selectedDifficulty) === 'EASY'
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
                      <div className="text-xs text-slate-500 mt-0.5">
                        {sessionScore.correct} of {sessionScore.total} solved correctly
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Difficulty Tier</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {!adaptiveMode ? selectedDifficulty : 'Adaptive IRT'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {!adaptiveMode ? 'User-Calibrated Challenge' : 'Dynamic Ability Matching'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Avg Response Time</div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                        {sessionScore.total > 0 ? Math.round(sessionScore.totalTime / sessionScore.total) : 0}s
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">per problem</div>
                    </div>
                  </div>

                  {/* Detailed Post-Session Wrong Answers & Explanations Review */}
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-left space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Post-Session Concept Analysis & Wrong Answers Review
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Review each problem you missed during this session along with detailed step-by-step conceptual explanations to bridge understanding.
                        </p>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setSummaryFilter('WRONG')}
                          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${summaryFilter === 'WRONG'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Wrong Answers ({sessionAttemptSummaries.filter((a) => !a.isCorrect).length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSummaryFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${summaryFilter === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          <span>All Questions ({sessionAttemptSummaries.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* If 100% Correct / No Mistakes */}
                    {sessionAttemptSummaries.filter((a) => !a.isCorrect).length === 0 ? (
                      <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-center space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
                          ✨
                        </div>
                        <h5 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                          Flawless Session! 100% Accuracy
                        </h5>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300/80 max-w-md mx-auto">
                          You answered every question in this practice set correctly. No conceptual errors or misconceptions were detected!
                        </p>
                      </div>
                    ) : (
                      /* List of Mistakes or Filtered Questions */
                      <div className="space-y-4">
                        {(summaryFilter === 'WRONG'
                          ? sessionAttemptSummaries.filter((a) => !a.isCorrect)
                          : sessionAttemptSummaries
                        ).map((attempt) => (
                          <div
                            key={attempt.questionId + '-' + attempt.questionNumber}
                            className={`p-5 rounded-2xl border transition ${attempt.isCorrect
                              ? 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                              }`}
                          >
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${attempt.isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                                  }`}>
                                  Q{attempt.questionNumber}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {attempt.topicName}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-md border ${attempt.difficulty === 'EASY'
                                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                                    : attempt.difficulty === 'MEDIUM'
                                      ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                                      : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                                    }`}
                                >
                                  {attempt.difficulty}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-400 font-mono text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {attempt.timeTakenSeconds}s
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold uppercase ${attempt.isCorrect
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                    }`}
                                >
                                  {attempt.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                            </div>

                            {/* Question Text */}
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                              {attempt.questionText}
                            </h5>

                            {/* Answer comparison */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                              {/* Student's answer */}
                              <div
                                className={`p-3 rounded-xl border flex items-start gap-2.5 ${attempt.isCorrect
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-200'
                                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-200'
                                  }`}
                              >
                                {attempt.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <span className="block text-xs font-extrabold uppercase tracking-wider opacity-75 mb-0.5">
                                    Your Answer:
                                  </span>
                                  <span className="font-medium">{attempt.selectedOptionText}</span>
                                </div>
                              </div>

                              {/* Correct answer */}
                              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="block text-xs font-extrabold uppercase tracking-wider opacity-75 mb-0.5">
                                    Correct Solution:
                                  </span>
                                  <span className="font-semibold">{attempt.correctOptionText}</span>
                                </div>
                              </div>
                            </div>

                            {/* Detailed Explanation */}
                            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed space-y-1.5">
                              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Detailed Explanation & Conceptual Rationale:</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 pl-5">
                                {attempt.explanation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setActiveSession(null);
                        setSessionCompleted(false);
                        setSessionAttemptSummaries([]);
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
                        className={`p-5 rounded-2xl border ${attemptResult.isCorrect
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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
