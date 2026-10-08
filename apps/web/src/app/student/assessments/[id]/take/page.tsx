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
  EyeOff,
  Smartphone,
  Terminal,
  Code,
  Play,
  RotateCcw,
  Sparkles,
  FileCode,
  Check,
  CheckSquare,
  Layers,
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
  // In-Browser Code Judge Workspace State
  // ---------------------------------------------------------------------------
  const [codingAnswers, setCodingAnswers] = useState<Record<string, { sourceCode: string; language: string }>>({});
  const [codingActiveTab, setCodingActiveTab] = useState<'problem' | 'testcases'>('problem');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runOutput, setRunOutput] = useState<any | null>(null);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState<number>(0);

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

  // ---------------------------------------------------------------------------
  // Hardened Anti-Cheat & 3-Strike Face Absence States
  // ---------------------------------------------------------------------------
  const [faceStrikeCount, setFaceStrikeCount] = useState<number>(0);
  const [faceAlertModal, setFaceAlertModal] = useState<{
    show: boolean;
    strike: number;
    isFinal: boolean;
    isTerminated: boolean;
  } | null>(null);

  const [tabSwitchTerminated, setTabSwitchTerminated] = useState(false);
  const [mobileAlertModal, setMobileAlertModal] = useState(false);

  const preflightVideoRef = useRef<HTMLVideoElement>(null);
  const livePipVideoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  const consecutiveFaceAbsentRef = useRef<number>(0);
  const faceModalActiveRef = useRef<boolean>(false);
  const faceStrikeCountRef = useRef<number>(0);
  const isAutoSubmittingRef = useRef<boolean>(false);
  const visionModelRef = useRef<any>(null);
  const isDetectingRef = useRef<boolean>(false);

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
      // Initialize default starter codes for any coding questions
      if (data.questions && data.questions.length > 0) {
        const initialCoding: Record<string, { sourceCode: string; language: string }> = {};
        data.questions.forEach((q: any) => {
          if (q.type === 'CODING' || q.codingProblem) {
            const prob = q.codingProblem;
            const defLang = 'PYTHON';
            const starter = prob?.starterCodes?.[defLang] ||
              prob?.starterCodes?.['JAVASCRIPT'] ||
              'def solution(*args):\n    # Write your algorithmic solution here\n    pass\n';
            initialCoding[q.id] = {
              sourceCode: starter,
              language: defLang,
            };
          }
        });
        setCodingAnswers(initialCoding);
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
    details: string,
    snapshot?: string
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

    const detailPayload = snapshot ? `${details} [SNAPSHOT:${snapshot}]` : details;

    // Report to backend proctoring service
    if (examData.submissionId) {
      api.post(`/proctoring/sessions/${examData.submissionId}/violation`, {
        type,
        severity,
        confidence: 0.98,
        details: detailPayload,
      }).catch((e) => console.error('Violation reporting failed:', e));
    }
  };

  // ---------------------------------------------------------------------------
  // Pre-load TensorFlow.js and COCO-SSD for client-side object detection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    const loadVisionDetector = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!(window as any).tf) {
          const s1 = document.createElement('script');
          s1.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
          s1.crossOrigin = 'anonymous';
          document.head.appendChild(s1);
          await new Promise((res, rej) => {
            s1.onload = res;
            s1.onerror = rej;
          });
        }
        if (!(window as any).cocoSsd) {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
          s2.crossOrigin = 'anonymous';
          document.head.appendChild(s2);
          await new Promise((res, rej) => {
            s2.onload = res;
            s2.onerror = rej;
          });
        }
        if (active && (window as any).cocoSsd && !visionModelRef.current) {
          const m = await (window as any).cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (active) {
            visionModelRef.current = m;
            console.log('AI Proctoring Vision Model loaded successfully.');
          }
        }
      } catch (err) {
        console.warn('COCO-SSD model fallback active:', err);
      }
    };
    loadVisionDetector();
    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Real-Time Browser Integrity Monitoring Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight) return;

    // 1. Tab Switching Detection -> IMMEDIATE AUTO-SUBMIT
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!isAutoSubmittingRef.current && !result) {
          isAutoSubmittingRef.current = true;
          setTabSwitchTerminated(true);
          reportViolation(
            'TAB_SWITCH',
            'SEVERE',
            'Student switched browser tab. Exam auto-submitted immediately per integrity policy.'
          );
          submitExam();
        }
      }
    };

    // 2. Window Blur (Switching Apps) Detection
    const handleWindowBlur = () => {
      if (!isAutoSubmittingRef.current && !result) {
        reportViolation('WINDOW_BLUR', 'MEDIUM', 'Student switched application or lost window focus.');
      }
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

    // 4. Strict Copy / Paste Blocking
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('WINDOW_BLUR', 'LOW', 'Unauthorized copy attempt prevented.');
      setWarningMessage('INTEGRITY ALERT: Copying assessment question text is strictly disabled.');
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setWarningMessage('INTEGRITY ALERT: Cut operation is disabled.');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('WINDOW_BLUR', 'MEDIUM', 'Unauthorized paste attempt prevented.');
      setWarningMessage('INTEGRITY ALERT: Pasting external content into assessment is strictly prohibited.');
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setWarningMessage('INTEGRITY ALERT: Context menu is disabled during the exam.');
    };
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+P, Ctrl+U, Ctrl+S
      if (cmdOrCtrl && ['c', 'v', 'x', 'a', 'p', 'u', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        setWarningMessage(`INTEGRITY ALERT: Keyboard shortcut Ctrl+${e.key.toUpperCase()} is disabled.`);
        return;
      }
      // Block F12 and Devtools
      if (
        e.key === 'F12' ||
        (cmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setWarningMessage('INTEGRITY ALERT: Developer inspection tools are disabled.');
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    window.addEventListener('paste', handlePaste, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('selectstart', handleSelectStart, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('selectstart', handleSelectStart, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [examData, result, showPreFlight]);

  // ---------------------------------------------------------------------------
  // Periodic Visual & Object Detection Telemetry (Every 1.5s)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight || !mediaStream) return;

    const interval = setInterval(async () => {
      if (isDetectingRef.current || isAutoSubmittingRef.current) return;
      const video = livePipVideoRef.current;
      const canvas = offscreenCanvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

      isDetectingRef.current = true;
      try {
        let isPersonFound = false;

        // A. Run TF / COCO-SSD object detection
        if (visionModelRef.current) {
          try {
            const predictions = await visionModelRef.current.detect(video);
            const vWidth = video.videoWidth || 640;
            const vHeight = video.videoHeight || 480;

            // 1. Mobile phone detection with visual snapshot capture
            const phone = predictions.find((p: any) => {
              if (!['cell phone', 'remote', 'telephone'].includes(p.class) || p.score < 0.38) return false;
              // Spatial focus check: Phone must be within active student workspace (central 85% width)
              const cx = (p.bbox[0] + p.bbox[2] / 2) / vWidth;
              return cx >= 0.08 && cx <= 0.92;
            });

            if (phone) {
              // Capture 320x240 compressed JPEG visual evidence snapshot for faculty audit console
              let snapshotUri = '';
              try {
                canvas.width = 320;
                canvas.height = 240;
                const snapCtx = canvas.getContext('2d');
                if (snapCtx) {
                  snapCtx.drawImage(video, 0, 0, 320, 240);
                  snapshotUri = canvas.toDataURL('image/jpeg', 0.6);
                }
              } catch {}

              reportViolation(
                'MOBILE_PHONE_DETECTED',
                'SEVERE',
                `Mobile phone detected in workstation view (${Math.round(phone.score * 100)}% confidence).`,
                snapshotUri
              );
              setMobileAlertModal(true);
            }

            // 2. Person detection with Lab Spatial Neighbor Filter
            // In computer labs, students sit in adjacent rows ~1m apart.
            // Filter: Only count persons in the primary central workstation zone (cx: 8%-92%)
            // and with significant bounding area (>= 6% of frame) to avoid background passersby.
            const primaryPersons = predictions.filter((p: any) => {
              if (p.class !== 'person' || p.score < 0.42) return false;
              const [bx, by, bw, bh] = p.bbox;
              const cx = (bx + bw / 2) / vWidth;
              const areaRatio = (bw * bh) / (vWidth * vHeight);
              return cx >= 0.08 && cx <= 0.92 && areaRatio >= 0.06;
            });

            if (primaryPersons.length > 0) {
              isPersonFound = true;
            }
            if (primaryPersons.length > 1) {
              reportViolation(
                'MULTIPLE_FACES',
                'HIGH',
                `Multiple individuals (${primaryPersons.length}) detected within primary examination workspace.`
              );
            }
          } catch (modelErr) {
            console.warn('Vision detection cycle error:', modelErr);
          }
        }

        // B. Canvas Luminance & Skin-tone heuristic
        canvas.width = 64;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 64, 48);
          const frame = ctx.getImageData(0, 0, 64, 48);
          const data = frame.data;
          let totalBrightness = 0;
          let skinCount = 0;
          const totalPixels = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            totalBrightness += (r + g + b) / 3;

            // Skin tone color range
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && (r - b) > 15) {
              skinCount++;
            }
          }

          const avgBrightness = totalBrightness / totalPixels;
          const skinRatio = skinCount / totalPixels;

          // Camera covered or blacked out
          if (avgBrightness < 12) {
            isPersonFound = false;
          } else if (!visionModelRef.current) {
            // Fallback when model is not ready: check skin ratio
            if (skinRatio >= 0.035) {
              isPersonFound = true;
            }
          }
        }

        // C. Face Absence 3-Strike Enforcement
        if (!isPersonFound) {
          consecutiveFaceAbsentRef.current += 1;
          // After 2 consecutive missing frames (~3 seconds)
          if (consecutiveFaceAbsentRef.current >= 2) {
            setFacePresent(false);

            if (!faceModalActiveRef.current && !isAutoSubmittingRef.current) {
              faceModalActiveRef.current = true;
              const nextStrike = faceStrikeCountRef.current + 1;
              faceStrikeCountRef.current = nextStrike;
              setFaceStrikeCount(nextStrike);

              if (nextStrike === 1) {
                reportViolation('NO_FACE', 'LOW', 'Face not visible in camera frame (Warning 1/3).');
                setFaceAlertModal({ show: true, strike: 1, isFinal: false, isTerminated: false });
              } else if (nextStrike === 2) {
                reportViolation('NO_FACE', 'MEDIUM', 'Face not visible in camera frame (Warning 2/3).');
                setFaceAlertModal({ show: true, strike: 2, isFinal: false, isTerminated: false });
              } else if (nextStrike === 3) {
                reportViolation('NO_FACE', 'HIGH', 'Face not visible in camera frame (FINAL WARNING 3/3).');
                setFaceAlertModal({ show: true, strike: 3, isFinal: true, isTerminated: false });
              } else if (nextStrike >= 4) {
                reportViolation('NO_FACE', 'SEVERE', 'Exam terminated: Maximum face absence limit exceeded.');
                setFaceAlertModal({ show: true, strike: 4, isFinal: true, isTerminated: true });
                isAutoSubmittingRef.current = true;
                handleAutoSubmit('FACE_ABSENCE_EXCEEDED');
              }
            }
          }
        } else {
          consecutiveFaceAbsentRef.current = 0;
          setFacePresent(true);
        }
      } catch (err) {
        // catch canvas / detection safety
      } finally {
        isDetectingRef.current = false;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [examData, result, showPreFlight, mediaStream]);

  const acknowledgeFaceStrike = () => {
    faceModalActiveRef.current = false;
    consecutiveFaceAbsentRef.current = 0;
    setFaceAlertModal(null);
    setFacePresent(true);
  };

  const dismissMobileAlert = () => {
    setMobileAlertModal(false);
  };

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

  const handleAutoSubmit = async (reason?: string) => {
    if (submitting || result) return;
    // Lab concurrency jitter: Stagger simultaneous end-of-exam submissions across 0-2200ms
    // Immediate violations (tab switch, face absence) submit with 0ms delay
    const jitter =
      reason === 'TAB_SWITCH' || reason === 'FACE_ABSENCE_EXCEEDED'
        ? 0
        : Math.floor(Math.random() * 2200);

    setTimeout(() => {
      submitExam();
    }, jitter);
  };

  const handleCodeChange = (qId: string, val: string) => {
    setCodingAnswers((prev) => ({
      ...prev,
      [qId]: {
        sourceCode: val,
        language: prev[qId]?.language || 'PYTHON',
      },
    }));
  };

  const handleLanguageChange = (qId: string, newLang: string) => {
    const prob = examData?.questions?.find((q: any) => q.id === qId)?.codingProblem;
    const starter = prob?.starterCodes?.[newLang] || '';
    setCodingAnswers((prev) => ({
      ...prev,
      [qId]: {
        language: newLang,
        sourceCode: prev[qId]?.sourceCode && prev[qId]?.sourceCode !== prob?.starterCodes?.[prev[qId]?.language]
          ? prev[qId].sourceCode
          : (starter || prev[qId]?.sourceCode || ''),
      },
    }));
  };

  const handleResetCode = (qId: string) => {
    const prob = examData?.questions?.find((q: any) => q.id === qId)?.codingProblem;
    const curLang = codingAnswers[qId]?.language || 'PYTHON';
    const starter = prob?.starterCodes?.[curLang] || '';
    if (confirm('Reset your code to the default template? Any unsaved edits will be lost.')) {
      setCodingAnswers((prev) => ({
        ...prev,
        [qId]: {
          language: curLang,
          sourceCode: starter,
        },
      }));
      setRunOutput(null);
    }
  };

  const handleRunSampleCases = async (q: any) => {
    setIsRunningCode(true);
    setRunOutput(null);
    try {
      const cur = codingAnswers[q.id] || {
        sourceCode: q.codingProblem?.starterCodes?.PYTHON || '',
        language: 'PYTHON',
      };
      const probTarget = q.codingProblem?.slug || q.codingProblem?.id || 'adhoc';
      const res = await api.post(`/coding/problems/${probTarget}/run`, {
        language: cur.language,
        sourceCode: cur.sourceCode,
        sampleTestCases: q.codingProblem?.sampleTestCases,
      });
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        status: 'ERROR',
        errorMessage: err.message || 'Execution error encountered',
      });
    } finally {
      setIsRunningCode(false);
    }
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
      sourceCode: codingAnswers[q.id]?.sourceCode || undefined,
      code: codingAnswers[q.id]?.sourceCode || undefined,
      language: codingAnswers[q.id]?.language || 'PYTHON',
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
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Offscreen hidden canvas for luminance telemetry */}
      <canvas ref={offscreenCanvasRef} className="hidden" />

      {/* 1. Tab Switching Auto-Submit Blocker Overlay */}
      {tabSwitchTerminated && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-600 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/80">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Exam Automatically Terminated
              </span>
              <h2 className="text-2xl font-black text-white">Tab Switching Detected</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                You navigated away from the exam tab. According to institutional examination rules, tab switching results in immediate automatic submission of your assessment.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span>Auto-submission Status:</span>
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting to Evaluation Server...
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Your submitted responses and proctoring audit telemetry have been transmitted to the Faculty Audit Console.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Face Absence 3-Strike Warning Overlay */}
      {faceAlertModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div
            className={`max-w-lg w-full bg-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl border-2 ${
              faceAlertModal.isTerminated
                ? 'border-rose-600 shadow-rose-950/80'
                : faceAlertModal.isFinal
                ? 'border-rose-500 shadow-rose-950/80 ring-4 ring-rose-500/30 animate-pulse'
                : 'border-amber-500/70 shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${
                faceAlertModal.isTerminated || faceAlertModal.isFinal
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {faceAlertModal.isTerminated ? (
                <XCircle className="w-10 h-10" />
              ) : faceAlertModal.isFinal ? (
                <ShieldAlert className="w-10 h-10" />
              ) : (
                <CameraOff className="w-10 h-10" />
              )}
            </div>

            <div className="space-y-3">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-full border uppercase tracking-wider ${
                  faceAlertModal.isTerminated
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : faceAlertModal.isFinal
                    ? 'bg-rose-500/30 text-rose-200 border-rose-500/50'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {faceAlertModal.isTerminated
                  ? 'Auto-Submission Triggered'
                  : faceAlertModal.isFinal
                  ? 'FINAL WARNING: Strike 3 of 3'
                  : `Warning: Strike ${faceAlertModal.strike} of 3`}
              </span>

              <h2 className="text-2xl font-black text-white">
                {faceAlertModal.isTerminated
                  ? 'Assessment Auto-Submitted'
                  : faceAlertModal.isFinal
                  ? 'Critical Warning: Face Missing!'
                  : 'You Are Not Visible in Camera'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {faceAlertModal.isTerminated ? (
                  'You were absent from the camera frame 4 times despite 3 prior integrity alerts. In accordance with examination regulations, your assessment has been automatically submitted.'
                ) : faceAlertModal.isFinal ? (
                  <strong className="text-rose-300 block">
                    You are not visible in the camera frame! THIS IS YOUR FINAL WARNING. If this is done again, your exam will be automatically submitted immediately!
                  </strong>
                ) : (
                  `You are not visible in the camera frame. Please position yourself clearly in front of the webcam. (Warning ${faceAlertModal.strike} of 3).`
                )}
              </p>
            </div>

            {faceAlertModal.isTerminated ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-400 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizing assessment auto-submission...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={acknowledgeFaceStrike}
                className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 ${
                  faceAlertModal.isFinal
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>
                  {faceAlertModal.isFinal
                    ? 'I Understand & Return to Exam'
                    : 'I Am Back in Frame'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Mobile Device / Phone Detected Modal */}
      {mobileAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/80 animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Integrity Violation Detected
              </span>
              <h2 className="text-2xl font-black text-white">Mobile Device Detected!</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The AI proctoring system detected a <strong className="text-rose-400">cell phone / mobile device</strong> in camera view. Taking photographs of exam questions, scanning screens, or using secondary devices is strictly prohibited.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-medium">
              ⚠️ This incident has been logged with camera telemetry and timestamp in the Faculty Proctoring Audit Console (-35% Trust Score).
            </div>

            <button
              type="button"
              onClick={dismissMobileAlert}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Have Removed the Mobile Device</span>
            </button>
          </div>
        </div>
      )}

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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs dark:shadow-xl space-y-6">
              {/* Top Meta Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Question {currentIdx + 1} of {qList.length} • {currentQ.points} Points
                  </span>
                  {(currentQ.type === 'CODING' || currentQ.codingProblem) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      Practical Coding Exam
                    </span>
                  )}
                  {currentQ.difficulty && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                        currentQ.difficulty === 'EASY'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : currentQ.difficulty === 'HARD'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {currentQ.difficulty}
                    </span>
                  )}
                </div>

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

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.codingProblem?.title || currentQ.questionText}
              </h3>

              {/* Conditional: CODING QUESTION WORKSPACE */}
              {(currentQ.type === 'CODING' || currentQ.codingProblem) ? (
                <div className="space-y-5">
                  {/* Problem Details & Sample Test Cases Tabs */}
                  <div className="rounded-2xl border border-slate-700/80 bg-[#0F172A] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1E293B] border-b border-slate-700 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCodingActiveTab('problem')}
                        className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                          codingActiveTab === 'problem'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Problem Statement</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodingActiveTab('testcases')}
                        className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                          codingActiveTab === 'testcases'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sample Test Cases ({currentQ.codingProblem?.sampleTestCases?.length || 0})</span>
                      </button>
                    </div>

                    <div className="p-5 text-xs sm:text-sm text-slate-200">
                      {codingActiveTab === 'problem' ? (
                        <div className="space-y-4">
                          {/* Full Problem Description */}
                          <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                            {currentQ.codingProblem?.description || currentQ.questionText}
                          </div>

                          {/* Constraints */}
                          {currentQ.codingProblem?.constraints && (
                            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1">
                              <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                                Constraints
                              </span>
                              <div className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                                {currentQ.codingProblem.constraints}
                              </div>
                            </div>
                          )}

                          {/* Hints */}
                          {currentQ.codingProblem?.hints && (Array.isArray(currentQ.codingProblem.hints) ? currentQ.codingProblem.hints.length > 0 : !!currentQ.codingProblem.hints) && (
                            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                              <span className="text-[11px] font-bold text-indigo-300 block uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                Algorithmic Guidance & Hint
                              </span>
                              <div className="text-[11px] text-slate-300">
                                {Array.isArray(currentQ.codingProblem.hints)
                                  ? currentQ.codingProblem.hints.join(' • ')
                                  : currentQ.codingProblem.hints}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[11px] text-slate-400 mb-2">
                            These sample test cases are executed when you click <strong className="text-cyan-300">Run Sample Cases</strong>. (Evaluation check test cases will remain hidden and run upon final exam submission).
                          </p>
                          {(!currentQ.codingProblem?.sampleTestCases || currentQ.codingProblem.sampleTestCases.length === 0) ? (
                            <div className="p-6 text-center text-slate-500">
                              No sample test cases specified for this problem.
                            </div>
                          ) : (
                            currentQ.codingProblem.sampleTestCases.map((stc: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 font-mono text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                                  <span>Sample Case {sIdx + 1}</span>
                                  {stc.explanation && (
                                    <span className="text-slate-400 font-normal font-sans text-[10px]">
                                      {stc.explanation}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                                    <span className="text-[10px] text-slate-500 font-sans block mb-0.5">Sample Input:</span>
                                    <span className="text-emerald-300">{stc.input}</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                                    <span className="text-[10px] text-slate-500 font-sans block mb-0.5">Sample Expected Output:</span>
                                    <span className="text-white font-bold">{stc.expectedOutput}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In-Browser Code Judge IDE Panel */}
                  <div className="rounded-2xl border border-cyan-500/30 bg-[#0B0F19] overflow-hidden shadow-2xl space-y-0">
                    {/* IDE Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#111827] border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">Code Solution</span>
                        <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-xl border border-slate-700 ml-2">
                          {['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'].map((langKey) => {
                            const isCur = (codingAnswers[currentQ.id]?.language || 'PYTHON') === langKey;
                            const langLabel = langKey === 'PYTHON' ? 'Python 3' : langKey === 'JAVASCRIPT' ? 'JavaScript' : langKey === 'CPP' ? 'C++' : 'Java';
                            return (
                              <button
                                key={langKey}
                                type="button"
                                onClick={() => handleLanguageChange(currentQ.id, langKey)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                  isCur
                                    ? 'bg-cyan-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {langLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetCode(currentQ.id)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1"
                          title="Reset to starter template"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRunSampleCases(currentQ)}
                          disabled={isRunningCode}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isRunningCode ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Judging...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Run Sample Cases</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Interactive Code Editor Area */}
                    <div className="relative">
                      <textarea
                        rows={12}
                        value={codingAnswers[currentQ.id]?.sourceCode ?? (currentQ.codingProblem?.starterCodes?.[codingAnswers[currentQ.id]?.language || 'PYTHON'] || '')}
                        onChange={(e) => handleCodeChange(currentQ.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const target = e.currentTarget;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            const val = target.value;
                            const updated = val.substring(0, start) + '    ' + val.substring(end);
                            handleCodeChange(currentQ.id, updated);
                            setTimeout(() => {
                              target.selectionStart = target.selectionEnd = start + 4;
                            }, 0);
                          }
                        }}
                        spellCheck={false}
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="Write your algorithmic solution here..."
                        className="w-full p-4 bg-[#0A0E17] text-cyan-200 placeholder-slate-600 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-y border-none"
                        style={{ tabSize: 4 }}
                      />
                    </div>

                    {/* Code Runner Execution Console */}
                    {runOutput && (
                      <div className="p-4 bg-[#111827] border-t border-slate-800 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                runOutput.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {runOutput.status === 'ACCEPTED' ? '✓ Sample Cases Passed' : `✕ ${runOutput.status || 'FAILED'}`}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Passed {runOutput.testCasesPassed || 0} / {runOutput.totalTestCases || 0} cases
                            </span>
                          </div>

                          {runOutput.executionTimeMs !== undefined && (
                            <span className="text-[11px] font-mono text-slate-400">
                              Time: {runOutput.executionTimeMs}ms • Mem: {runOutput.memoryKb || 128}KB
                            </span>
                          )}
                        </div>

                        {/* Error Message if Compilation / Runtime Error */}
                        {runOutput.errorMessage && (
                          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono text-xs whitespace-pre-wrap">
                            {runOutput.errorMessage}
                          </div>
                        )}

                        {/* Detailed Test Results Breakdown */}
                        {runOutput.testResults && runOutput.testResults.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {runOutput.testResults.map((tr: any, trIdx: number) => (
                              <div
                                key={trIdx}
                                className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                                  tr.passed
                                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="flex items-center gap-1.5">
                                    {tr.passed ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    )}
                                    Sample Case {trIdx + 1}: {tr.passed ? 'PASSED' : 'FAILED'}
                                  </span>
                                  {tr.executionTimeMs !== undefined && (
                                    <span className="text-slate-400 text-[10px]">{tr.executionTimeMs}ms</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Input:</span>
                                    <span className="text-white">{tr.input}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Expected:</span>
                                    <span className="text-emerald-300">{tr.expectedOutput}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Your Output:</span>
                                    <span className={tr.passed ? 'text-emerald-300' : 'text-rose-300'}>
                                      {tr.actualOutput !== undefined ? String(tr.actualOutput) : 'None'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* MCQ Question Options */
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
              )}

              {/* Pagination controls */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => {
                    setCurrentIdx((prev) => Math.max(0, prev - 1));
                    setRunOutput(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIdx === qList.length - 1}
                  onClick={() => {
                    setCurrentIdx((prev) => Math.min(qList.length - 1, prev + 1));
                    setRunOutput(null);
                  }}
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
                const isAnswered = (q.type === 'CODING' || q.codingProblem)
                  ? !!codingAnswers[q.id]?.sourceCode?.trim()
                  : !!answers[q.id];
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
                    onClick={() => {
                      setCurrentIdx(idx);
                      setRunOutput(null);
                    }}
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
