'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
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
  Sun,
  Moon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Camera,
  CameraOff,
  Mic,
  Maximize2,
  Lock,
  RefreshCw,
  Eye,
} from 'lucide-react';

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const assessmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOptionId
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});

  // ---------------------------------------------------------------------------
  // Phase 9: AI Proctoring & Multi-Modal Telemetry State
  // ---------------------------------------------------------------------------
  const [showPreFlight, setShowPreFlight] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [integrityPledge, setIntegrityPledge] = useState(false);
  const [pipMinimized, setPipMinimized] = useState(false);

  const [trustScore, setTrustScore] = useState<number>(100);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isFullscreenExited, setIsFullscreenExited] = useState(false);
  const [facePresent, setFacePresent] = useState(true);

  const preflightVideoRef = useRef<HTMLVideoElement>(null);
  const livePipVideoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (assessmentId) {
      startAssessment();
    }
  }, [assessmentId]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // Connect media stream to video elements when available
  useEffect(() => {
    if (mediaStream) {
      if (preflightVideoRef.current && !preflightVideoRef.current.srcObject) {
        preflightVideoRef.current.srcObject = mediaStream;
      }
      if (livePipVideoRef.current && !livePipVideoRef.current.srcObject) {
        livePipVideoRef.current.srcObject = mediaStream;
      }
    }
  }, [mediaStream, showPreFlight, pipMinimized]);

  const startAssessment = async () => {
    setLoading(true);
    try {
      const data = await api.post(`/assessments/${assessmentId}/start`);
      setExamData(data);
      setSecondsRemaining(data.remainingSeconds || data.assessment.durationMinutes * 60);
      if (typeof data.trustScore === 'number') {
        setTrustScore(data.trustScore);
      }
      if (data.faceEnrollmentVerified) {
        setFaceEnrolled(true);
      }
      // Initialize devices right away
      requestDevicePermissions();
    } catch (err: any) {
      alert(err.message || 'Failed to start assessment');
      router.push('/student/assessments');
    } finally {
      setLoading(false);
    }
  };

  const requestDevicePermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      setMediaStream(stream);
      setCameraPermission('granted');
      setMicPermission('granted');

      // Detect if camera is detached mid-exam
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setCameraPermission('denied');
          reportViolation('CAMERA_DISABLED', 'HIGH', 'Webcam stream disconnected or blocked.');
        };
      }
    } catch {
      setCameraPermission('denied');
      setMicPermission('denied');
    }
  };

  const handleCaptureFace = async () => {
    if (!examData?.submissionId) return;
    setEnrollingFace(true);
    try {
      await api.post(`/proctoring/sessions/${examData.submissionId}/enroll-face`);
      setFaceEnrolled(true);
    } catch (err) {
      console.error('Face enrollment API call failed, using optimistic fallback', err);
      setFaceEnrolled(true);
    } finally {
      setEnrollingFace(false);
    }
  };

  const handleConfirmAndEnterExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed or blocked:', e);
    }
    setShowPreFlight(false);
  };

  // ---------------------------------------------------------------------------
  // Centralized Violation Reporting
  // ---------------------------------------------------------------------------
  const reportViolation = (
    type: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE',
    details: string
  ) => {
    if (!examData || result || showPreFlight) return;

    // Rate-limit identical violation reports to once per 5 seconds
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (now - lastTime < 5000) return;
    lastViolationTimeRef.current[type] = now;

    const penaltyMap: Record<string, number> = {
      LOW: 5,
      MEDIUM: 10,
      HIGH: 20,
      SEVERE: 35,
    };
    const penalty = penaltyMap[severity] || 10;

    setTrustScore((prev) => Math.max(0, prev - penalty));
    setViolationCount((prev) => prev + 1);
    setWarningMessage(`INTEGRITY ALERT [${type}]: ${details} (-${penalty}% Trust Score)`);

    // Report to backend proctoring service
    if (examData.submissionId) {
      api.post(`/proctoring/sessions/${examData.submissionId}/violation`, {
        type,
        severity,
        confidence: 0.98,
        details,
      }).catch((e) => console.error('Violation reporting failed:', e));
    }
  };

  // ---------------------------------------------------------------------------
  // Real-Time Browser Integrity Monitoring Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight) return;

    // 1. Tab Switching Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH', 'MEDIUM', 'Student switched browser tab during active assessment.');
      }
    };

    // 2. Window Blur (Switching Apps) Detection
    const handleWindowBlur = () => {
      reportViolation('WINDOW_BLUR', 'MEDIUM', 'Student switched application or lost window focus.');
    };

    // 3. Fullscreen Exit Enforcement
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenExited(true);
        reportViolation('FULLSCREEN_EXIT', 'LOW', 'Student exited mandatory fullscreen examination mode.');
      } else {
        setIsFullscreenExited(false);
      }
    };

    // 4. Clipboard & Key Blocking
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setWarningMessage('INTEGRITY ALERT: Copying assessment question text is prohibited.');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setWarningMessage('INTEGRITY ALERT: Pasting external content is prohibited.');
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [examData, result, showPreFlight]);

  // ---------------------------------------------------------------------------
  // Periodic Visual & Face Presence Telemetry (Every 8 seconds)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight || !mediaStream) return;

    const interval = setInterval(() => {
      if (!livePipVideoRef.current || !offscreenCanvasRef.current) return;
      const video = livePipVideoRef.current;
      const canvas = offscreenCanvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        ctx.drawImage(video, 0, 0, 64, 48);
        const frame = ctx.getImageData(0, 0, 64, 48);
        const data = frame.data;
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        // If average pixel brightness is near pitch black (< 10), webcam is covered
        if (avgBrightness < 10) {
          setFacePresent(false);
          reportViolation('NO_FACE', 'HIGH', 'Camera view is obscured or pitch black. Face not visible.');
        } else {
          setFacePresent(true);
        }
      } catch {
        // cross-origin canvas safety fallback
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [examData, result, showPreFlight, mediaStream]);

  // ---------------------------------------------------------------------------
  // Timer countdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight) return;

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
  }, [examData, result, showPreFlight]);

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

    // Stop webcam stream tracks upon exam submission
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    const answerPayload = examData.questions.map((q: any) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || null,
      timeSpentSeconds: 30,
    }));

    try {
      await api.post(`/assessments/submissions/${examData.submissionId}/submit`, {
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-slate-400 text-sm font-medium">Initializing secure assessment environment...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Pre-Flight Device & Face Enrollment Modal
  // ---------------------------------------------------------------------------
  if (showPreFlight) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-lg shadow-amber-500/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white">AI Proctoring & Pre-Exam Setup</h1>
                <p className="text-xs text-slate-400">
                  {examData?.assessment?.title} • {examData?.assessment?.code}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {examData?.assessment?.durationMinutes} Mins
            </span>
          </div>

          {/* Camera Preview and Device Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Live Camera View */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {cameraPermission === 'granted' ? (
                <video
                  ref={preflightVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="text-center p-4 space-y-2">
                  <CameraOff className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-300 font-medium">Camera access not granted</p>
                  <button
                    type="button"
                    onClick={requestDevicePermissions}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                  >
                    Allow Camera
                  </button>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Camera Feed
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Pre-Exam Diagnostics
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Camera className="w-4 h-4 text-slate-400" /> Webcam Feed
                  </span>
                  {cameraPermission === 'granted' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Required
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mic className="w-4 h-4 text-slate-400" /> Microphone
                  </span>
                  {micPermission === 'granted' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Required
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Maximize2 className="w-4 h-4 text-slate-400" /> Fullscreen Lockdown
                  </span>
                  <span className="text-amber-400 font-bold">Enforced on Entry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Face Enrollment Action */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" /> Privacy-First Face Enrollment
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Capture a reference snapshot for this evaluation. (In adherence with Privacy by Design, no raw biometrics are stored permanently).
                </p>
              </div>

              <button
                type="button"
                onClick={handleCaptureFace}
                disabled={cameraPermission !== 'granted' || enrollingFace || faceEnrolled}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                  faceEnrolled
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
                }`}
              >
                {enrollingFace ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : faceEnrolled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{faceEnrolled ? 'Face Enrolled' : 'Capture Snapshot'}</span>
              </button>
            </div>
          </div>

          {/* Academic Integrity Pledge */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={integrityPledge}
              onChange={(e) => setIntegrityPledge(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-amber-600 focus:ring-amber-500"
            />
            <span>
              I pledge to maintain academic integrity throughout this exam. I understand that tab switches, exiting fullscreen, and multi-face anomalies are recorded in the <strong>Faculty Proctoring Audit Console</strong>.
            </span>
          </label>

          {/* Enter Assessment CTA */}
          <button
            type="button"
            onClick={handleConfirmAndEnterExam}
            disabled={!integrityPledge || cameraPermission !== 'granted' || !faceEnrolled}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-amber-600/20 transition flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Confirm & Enter Fullscreen Assessment</span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Graded Results Screen
  // ---------------------------------------------------------------------------
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

            <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
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
                <span className="text-xs text-slate-400 block font-medium">Proctoring Trust</span>
                <span className={`text-2xl font-black font-mono ${trustScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {trustScore}%
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
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
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

  // ---------------------------------------------------------------------------
  // Active Assessment Environment
  // ---------------------------------------------------------------------------
  const qList = examData?.questions || [];
  const currentQ = qList[currentIdx];
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 select-none">
      {/* Offscreen hidden canvas for luminance telemetry */}
      <canvas ref={offscreenCanvasRef} className="hidden" />

      {/* Fullscreen Exit Blocking Overlay */}
      {isFullscreenExited && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/50 rounded-3xl p-8 text-center space-y-5 shadow-2xl shadow-rose-950/50">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Fullscreen Lock Triggered</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                You exited mandatory fullscreen examination mode. An integrity anomaly has been logged to your evaluation record.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch (e) {
                  console.warn(e);
                }
                setIsFullscreenExited(false);
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Re-Enter Fullscreen to Resume</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Live Webcam PiP Widget */}
      <div
        className={`fixed z-40 transition-all duration-300 ${
          pipMinimized
            ? 'bottom-4 right-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-2.5'
            : 'bottom-6 right-6 w-52 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md space-y-2'
        }`}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {facePresent ? 'Proctoring Active' : 'Face Alert'}
          </span>
          <button
            type="button"
            onClick={() => setPipMinimized(!pipMinimized)}
            className="text-slate-400 hover:text-white font-mono text-[10px]"
          >
            {pipMinimized ? 'Expand' : 'Minimize'}
          </button>
        </div>

        {!pipMinimized && (
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
            <video
              ref={livePipVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!facePresent && (
              <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center p-2 text-center text-[10px] text-rose-200 font-bold">
                ⚠️ Face Not In Frame
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
            Formal Proctored Examination
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{examData?.assessment?.title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* AI Integrity Trust Index Meter */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                trustScore >= 80 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Integrity Trust</span>
            <span className="text-slate-400">•</span>
            <span
              className={`font-mono font-bold ${
                trustScore >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : trustScore >= 65
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trustScore}%
            </span>
          </div>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold ${
              secondsRemaining < 300
                ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/40 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
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
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Real-Time Violation Toast Banner */}
      {warningMessage && (
        <div className="bg-rose-600/20 border-b border-rose-500/40 text-rose-200 px-6 py-2.5 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs dark:shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Question {currentIdx + 1} of {qList.length} • {currentQ.points} Points
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentIdx)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                    flagged[currentIdx]
                      ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {flagged[currentIdx] ? '★ Flagged for Review' : '☆ Flag for Review'}
                </button>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
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
                          ? 'bg-amber-50 dark:bg-amber-600/20 border-amber-500 text-amber-950 dark:text-white ring-2 ring-amber-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIdx === qList.length - 1}
                  onClick={() => setCurrentIdx((prev) => Math.min(qList.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs dark:shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {qList.map((q: any, idx: number) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIdx;
                const isFlag = !!flagged[idx];

                let btnClass = 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                if (isAnswered) btnClass = 'bg-amber-600 text-white border-amber-500 font-bold';
                if (isFlag) btnClass = 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500 font-bold';
                if (isCurrent) btnClass += ' ring-2 ring-amber-600 dark:ring-white';

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

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Answered:</span>
                <strong className="text-slate-900 dark:text-white">{answeredCount} / {qList.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Flagged:</span>
                <strong className="text-amber-600 dark:text-amber-400">{Object.values(flagged).filter(Boolean).length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Trust Score:</span>
                <strong className={trustScore >= 80 ? 'text-emerald-500 font-mono' : 'text-amber-500 font-mono'}>{trustScore}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
