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
  Users,
  UserX,
  Trophy,
  FileText,
} from 'lucide-react';
import { AssessmentLeaderboardView } from '@/components/AssessmentLeaderboardModal';

interface FaceFeatureProfile {
  grid: number[][]; // 8x8 normalized [r, g, b] cells
  colorHist: number[]; // 16-bin color distribution
  skinRatio: number;
  avgBrightness: number;
}

function extractFaceProfileFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): FaceFeatureProfile | null {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx || sw <= 0 || sh <= 0) return null;

  try {
    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;
    const totalPixels = data.length / 4;
    if (totalPixels === 0) return null;

    const gridRows = 8;
    const gridCols = 8;
    const grid = Array.from({ length: gridRows * gridCols }, () => [0, 0, 0, 0]);
    const colorHist = new Array(16).fill(0);
    let totalBrightness = 0;
    let skinCount = 0;

    for (let y = 0; y < sh; y++) {
      const row = Math.min(gridRows - 1, Math.floor((y / sh) * gridRows));
      for (let x = 0; x < sw; x++) {
        const col = Math.min(gridCols - 1, Math.floor((x / sw) * gridCols));
        const cellIdx = row * gridCols + col;

        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const br = (r + g + b) / 3;
        totalBrightness += br;

        grid[cellIdx][0] += r;
        grid[cellIdx][1] += g;
        grid[cellIdx][2] += b;
        grid[cellIdx][3] += 1;

        const bin = Math.min(15, Math.floor(r / 64) * 4 + Math.floor(g / 64));
        colorHist[bin]++;

        if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && (r - b) > 15) {
          skinCount++;
        }
      }
    }

    const normalizedGrid = grid.map((c) => {
      const count = c[3] || 1;
      return [c[0] / count / 255, c[1] / count / 255, c[2] / count / 255];
    });

    const normalizedHist = colorHist.map((v) => v / totalPixels);

    return {
      grid: normalizedGrid,
      colorHist: normalizedHist,
      skinRatio: skinCount / totalPixels,
      avgBrightness: totalBrightness / totalPixels,
    };
  } catch {
    return null;
  }
}

function compareFaceProfiles(p1: FaceFeatureProfile, p2: FaceFeatureProfile): number {
  if (!p1 || !p2) return 0;

  // Spatial grid cosine similarity
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;
  for (let i = 0; i < p1.grid.length; i++) {
    for (let j = 0; j < 3; j++) {
      const v1 = p1.grid[i][j];
      const v2 = p2.grid[i][j];
      dot += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }
  }
  const gridSim = mag1 > 0 && mag2 > 0 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;

  // Color histogram cosine similarity
  let hDot = 0;
  let hMag1 = 0;
  let hMag2 = 0;
  for (let i = 0; i < p1.colorHist.length; i++) {
    hDot += p1.colorHist[i] * p2.colorHist[i];
    hMag1 += p1.colorHist[i] * p1.colorHist[i];
    hMag2 += p2.colorHist[i] * p2.colorHist[i];
  }
  const histSim = hMag1 > 0 && hMag2 > 0 ? hDot / (Math.sqrt(hMag1) * Math.sqrt(hMag2)) : 0;

  // Skin ratio delta similarity
  const skinDiff = Math.abs(p1.skinRatio - p2.skinRatio);
  const skinSim = Math.max(0, 1 - skinDiff * 3);

  return gridSim * 0.55 + histSim * 0.35 + skinSim * 0.10;
}

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
  const [resultTab, setResultTab] = useState<'leaderboard' | 'review'>('leaderboard');
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [testEndedError, setTestEndedError] = useState<string | null>(null);

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
  const [mobileAlertModal, setMobileAlertModal] = useState<{
    show: boolean;
    strike: number;
    isTerminated: boolean;
  } | null>(null);
  const mobileStrikeCountRef = useRef<number>(0);
  const lastMobileStrikeTimeRef = useRef<number>(0);

  // Baseline Identity Verification & Continuous Multi-Person Detection States
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  const [unauthorizedPerson, setUnauthorizedPerson] = useState<'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null>(null);
  const unauthorizedPersonRef = useRef<'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null>(null);
  const baselineFaceProfileRef = useRef<FaceFeatureProfile | null>(null);
  const consecutiveMismatchRef = useRef<number>(0);
  const consecutiveUnauthorizedRef = useRef<number>(0);
  const consecutiveMobileDetectionRef = useRef<number>(0);

  const updateUnauthorizedPerson = (val: 'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null) => {
    unauthorizedPersonRef.current = val;
    setUnauthorizedPerson(val);
  };

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

  // Advanced Acoustic & Mobile Heuristic Telemetry Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const consecutiveAudioAlertRef = useRef<number>(0);
  const consecutiveMobileHeuristicRef = useRef<number>(0);

  useEffect(() => {
    if (assessmentId) {
      startAssessment();
      requestDevicePermissions();
    }
  }, [assessmentId]);

  // Clean up media streams and audio context on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
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
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('ended') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('closed') ||
        msg.toLowerCase().includes('concluded')
      ) {
        setTestEndedError(msg || 'This test has ended and is no longer accepting submissions.');
      } else {
        alert(msg || 'Failed to start assessment');
        router.push('/student/assessments');
      }
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

      // Initialize Web Audio API Analyser for ambient conversation / voice anomaly telemetry
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          if (actx.state === 'suspended') {
            actx.resume().catch(() => {});
          }
          const src = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          audioCtxRef.current = actx;
          analyserRef.current = analyser;
        }
      } catch (audioErr) {
        console.warn('Acoustic monitoring initialization bypassed:', audioErr);
      }

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
    const video = preflightVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera feed is still initializing. Please wait a moment and try again.');
      return;
    }

    setEnrollingFace(true);
    try {
      // 1. Capture unmirrored frame to offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      let snapshotUrl = '';

      if (ctx) {
        ctx.drawImage(video, 0, 0, 320, 240);
        snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);
        setBaselineSnapshot(snapshotUrl);

        // 2. Extract baseline candidate facial feature profile (center 60% of frame)
        const sx = Math.floor(canvas.width * 0.15);
        const sy = Math.floor(canvas.height * 0.10);
        const sw = Math.floor(canvas.width * 0.70);
        const sh = Math.floor(canvas.height * 0.80);
        const profile = extractFaceProfileFromCanvas(canvas, sx, sy, sw, sh);
        if (profile) {
          baselineFaceProfileRef.current = profile;
        }
      }

      // 3. Post to proctoring enrollment endpoint with snapshot
      await api.post(`/proctoring/sessions/${examData.submissionId}/enroll-face`, {
        snapshot: snapshotUrl,
      });
      setFaceEnrolled(true);
    } catch (err) {
      console.error('Face enrollment API call completed with local baseline fallback', err);
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
  // Pre-load TensorFlow.js and COCO-SSD with Resilient Multi-CDN Fallback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const loadScriptWithFallback = (urls: string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        let index = 0;
        const tryNext = () => {
          if (!active) return;
          if (index >= urls.length) {
            reject(new Error('All CDN sources failed to load'));
            return;
          }
          const s = document.createElement('script');
          s.src = urls[index++];
          s.crossOrigin = 'anonymous';
          s.async = true;
          let timer: any = null;
          s.onload = () => {
            if (timer) clearTimeout(timer);
            resolve();
          };
          s.onerror = () => {
            if (timer) clearTimeout(timer);
            s.remove();
            tryNext();
          };
          timer = setTimeout(() => {
            s.remove();
            tryNext();
          }, 3500);
          document.head.appendChild(s);
        };
        tryNext();
      });
    };

    const loadVisionDetector = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (!(window as any).tf) {
          await loadScriptWithFallback([
            'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
            'https://unpkg.com/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.17.0/tf.min.js',
          ]);
        }

        if (!(window as any).cocoSsd) {
          await loadScriptWithFallback([
            'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
            'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
          ]);
        }

        if (active && (window as any).cocoSsd && !visionModelRef.current) {
          const m = await (window as any).cocoSsd.load({ base: 'lite_mobilenet_v2' });
          if (active) {
            visionModelRef.current = m;
            console.log('AI Proctoring Vision Model loaded successfully.');
          }
        }
      } catch (err) {
        console.warn('COCO-SSD model fallback active (local computer vision heuristic will operate):', err);
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
  // Periodic Visual & Multi-Parameter Proctoring Telemetry (Every 1.0s)
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
        let isMobileDetected = false;
        let mobileConfidence = 0;
        let detectionDetails = '';

        // -------------------------------------------------------------
        // A. Primary Object & Phone Detection via COCO-SSD
        // -------------------------------------------------------------
        if (visionModelRef.current) {
          try {
            const predictions = await visionModelRef.current.detect(video);

            // 1. Precise Mobile Phone Detection (High Confidence + Sanity Check)
            const phone = predictions.find((p: any) => {
              const c = (p.class || '').toLowerCase();
              if (c !== 'cell phone' && c !== 'mobile phone') return false;
              if (p.score < 0.60) return false;

              // Bounding box validation to filter out spurious detections
              if (Array.isArray(p.bbox) && p.bbox.length === 4) {
                const [bx, by, bw, bh] = p.bbox;
                const vWidth = video.videoWidth || 640;
                const vHeight = video.videoHeight || 480;

                // A handheld phone shouldn't occupy > 45% of width or > 55% of height
                if (bw > vWidth * 0.45 || bh > vHeight * 0.55) return false;
                // Minimum noise threshold
                if (bw < 18 || bh < 18) return false;
                // Aspect ratio check (rectangular handheld device)
                const ratio = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
                if (ratio < 1.1 || ratio > 3.2) return false;
              }
              return true;
            });

            if (phone) {
              consecutiveMobileDetectionRef.current += 1;
              // Require 2 consecutive cycles of confirmed detection to eliminate sensor glitches
              if (consecutiveMobileDetectionRef.current >= 2) {
                isMobileDetected = true;
                mobileConfidence = Math.round(phone.score * 100);
                detectionDetails = `AI Vision: Handheld mobile phone detected (${mobileConfidence}% confidence).`;
              }
            } else {
              consecutiveMobileDetectionRef.current = 0;
            }

            // 2. Strict Person & Facial Identity Matching
            const persons = predictions.filter((p: any) => {
              return (p.class || '').toLowerCase() === 'person' && p.score >= 0.38;
            });

            if (persons.length === 0) {
              // 0 persons detected -> Registered candidate is not in frame
              isPersonFound = false;
              consecutiveUnauthorizedRef.current = 0;
              consecutiveMismatchRef.current = 0;
              if (unauthorizedPersonRef.current !== null) {
                updateUnauthorizedPerson(null);
              }
            } else if (persons.length > 1) {
              // Multiple people in camera frame -> Candidate not solely present
              isPersonFound = false;
              consecutiveUnauthorizedRef.current += 1;
              updateUnauthorizedPerson('MULTIPLE_FACES');
              reportViolation(
                'MULTIPLE_FACES',
                'HIGH',
                `Multiple individuals (${persons.length}) detected within primary examination workspace.`
              );
            } else if (persons.length === 1) {
              // Exactly 1 person. Verify against the screenshotted baseline face!
              if (baselineFaceProfileRef.current) {
                try {
                  canvas.width = 160;
                  canvas.height = 120;
                  const cCtx = canvas.getContext('2d');
                  if (cCtx) {
                    cCtx.drawImage(video, 0, 0, 160, 120);
                    const p0 = persons[0];
                    let sx = Math.floor(160 * 0.15);
                    let sy = Math.floor(120 * 0.10);
                    let sw = Math.floor(160 * 0.70);
                    let sh = Math.floor(120 * 0.80);

                    if (Array.isArray(p0.bbox) && p0.bbox.length === 4) {
                      const scaleX = 160 / video.videoWidth;
                      const scaleY = 120 / video.videoHeight;
                      sx = Math.max(0, Math.floor(p0.bbox[0] * scaleX));
                      sy = Math.max(0, Math.floor(p0.bbox[1] * scaleY));
                      sw = Math.min(160 - sx, Math.floor(p0.bbox[2] * scaleX));
                      sh = Math.min(120 - sy, Math.floor(p0.bbox[3] * scaleY * 0.65));
                    }

                    const currentProfile = extractFaceProfileFromCanvas(canvas, sx, sy, sw, sh);
                    if (currentProfile) {
                      const sim = compareFaceProfiles(baselineFaceProfileRef.current, currentProfile);
                      if (sim >= 0.50) {
                        // Registered enrolled face verified!
                        isPersonFound = true;
                        consecutiveMismatchRef.current = 0;
                        consecutiveUnauthorizedRef.current = 0;
                        if (unauthorizedPersonRef.current !== null) {
                          updateUnauthorizedPerson(null);
                        }
                      } else {
                        // Anything other than registered face -> Report strictly as Face Not Visible
                        isPersonFound = false;
                        consecutiveMismatchRef.current += 1;
                        updateUnauthorizedPerson('IDENTITY_MISMATCH');
                        reportViolation(
                          'NO_FACE',
                          'HIGH',
                          'Face not visible: Registered candidate face is not recognized in camera view.'
                        );
                      }
                    } else {
                      isPersonFound = false;
                    }
                  }
                } catch (profileErr) {
                  console.warn('Face comparison cycle error:', profileErr);
                  isPersonFound = false;
                }
              } else {
                isPersonFound = true;
              }
            }
          } catch (modelErr) {
            console.warn('Vision detection cycle error:', modelErr);
          }
        }

        // -------------------------------------------------------------
        // B. Canvas Computer Vision Baseline Telemetry (Skin Tone & Luminance)
        // Runs on every frame regardless of external AI model status
        // -------------------------------------------------------------
        canvas.width = 128;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 128, 96);
          const frame = ctx.getImageData(0, 0, 128, 96);
          const data = frame.data;
          let totalBrightness = 0;
          let skinCount = 0;
          const totalPixels = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const pxBrightness = (r + g + b) / 3;
            totalBrightness += pxBrightness;

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
            // Fallback face presence when AI model is loading
            if (baselineFaceProfileRef.current) {
              const currentProfile = extractFaceProfileFromCanvas(canvas, 20, 15, 88, 70);
              if (currentProfile) {
                const sim = compareFaceProfiles(baselineFaceProfileRef.current, currentProfile);
                if (sim >= 0.50 && skinRatio >= 0.035) {
                  isPersonFound = true;
                  consecutiveMismatchRef.current = 0;
                  if (unauthorizedPersonRef.current !== null) {
                    updateUnauthorizedPerson(null);
                  }
                } else {
                  isPersonFound = false;
                  updateUnauthorizedPerson('IDENTITY_MISMATCH');
                }
              } else {
                isPersonFound = false;
              }
            } else if (skinRatio >= 0.035) {
              isPersonFound = true;
            }
          }
        }

        // -------------------------------------------------------------
        // C. 2-Strike Mobile Phone Policy & Automatic Test Termination
        // -------------------------------------------------------------
        if (isMobileDetected) {
          const now = Date.now();
          if (now - lastMobileStrikeTimeRef.current >= 4500 && !isAutoSubmittingRef.current) {
            lastMobileStrikeTimeRef.current = now;
            const nextStrike = mobileStrikeCountRef.current + 1;
            mobileStrikeCountRef.current = nextStrike;

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

            if (nextStrike === 1) {
              reportViolation(
                'MOBILE_PHONE_DETECTED',
                'SEVERE',
                detectionDetails || 'Mobile device detected in examination workstation (Warning 1 of 2).',
                snapshotUri
              );
              setMobileAlertModal({ show: true, strike: 1, isTerminated: false });
            } else if (nextStrike >= 2) {
              reportViolation(
                'MOBILE_PHONE_DETECTED',
                'SEVERE',
                'Exam terminated: Maximum mobile phone warning limit (2/2) exceeded.',
                snapshotUri
              );
              setMobileAlertModal({ show: true, strike: 2, isTerminated: true });
              isAutoSubmittingRef.current = true;
              handleAutoSubmit('MOBILE_VIOLATIONS_EXCEEDED');
            }
          }
        }

        // -------------------------------------------------------------
        // D. Audio Telemetry Analysis (Acoustic Monitoring)
        // -------------------------------------------------------------
        if (analyserRef.current) {
          try {
            const bufferLen = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLen);
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLen; i++) {
              sum += dataArray[i];
            }
            const avgAudioVolume = sum / bufferLen;
            if (avgAudioVolume > 65) {
              consecutiveAudioAlertRef.current += 1;
              if (consecutiveAudioAlertRef.current >= 2) {
                reportViolation(
                  'AUDIO_ANOMALY',
                  'MEDIUM',
                  `Conversational voice or acoustic anomalies detected in examination room (Level: ${Math.round(avgAudioVolume)} dB).`
                );
                consecutiveAudioAlertRef.current = 0;
              }
            } else {
              consecutiveAudioAlertRef.current = 0;
            }
          } catch {}
        }

        // -------------------------------------------------------------
        // E. Face Absence 3-Strike Policy Enforcement
        // -------------------------------------------------------------
        if (!isPersonFound) {
          consecutiveFaceAbsentRef.current += 1;
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
    }, 1000);

    return () => clearInterval(interval);
  }, [examData, result, showPreFlight, mediaStream]);

  const acknowledgeFaceStrike = () => {
    faceModalActiveRef.current = false;
    consecutiveFaceAbsentRef.current = 0;
    setFaceAlertModal(null);
    setFacePresent(true);
  };

  const dismissMobileAlert = () => {
    setMobileAlertModal(null);
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

  if (testEndedError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Assessment Has Ended</h2>
            <p className="text-xs text-rose-400 font-semibold mt-1">Examination Window Closed</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            {testEndedError}
          </p>
          <button
            type="button"
            onClick={() => router.push('/student/assessments')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Return to Assessment Hub
          </button>
        </div>
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
                  <Eye className="w-4 h-4 text-amber-400" /> Identity Enrollment & Reference Snapshot
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Capture a clear baseline photo. The AI proctor continuously verifies that the same candidate remains in view. If an unauthorized individual appears, the exam screen is automatically blurred.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCaptureFace}
                disabled={cameraPermission !== 'granted' || enrollingFace}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                  faceEnrolled
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40'
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
                <span>{faceEnrolled ? 'Retake Snapshot' : 'Capture Snapshot'}</span>
              </button>
            </div>

            {baselineSnapshot && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 animate-in fade-in duration-200">
                <img
                  src={baselineSnapshot}
                  alt="Enrolled Reference"
                  className="w-14 h-11 object-cover rounded-lg border border-emerald-500/50"
                />
                <div className="text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Candidate Photo Enrolled
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Continuous facial match active. You must remain in frame alone throughout the exam.
                  </p>
                </div>
              </div>
            )}
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

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setResultTab('leaderboard')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                  resultTab === 'leaderboard'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>🏆 Class Leaderboard</span>
              </button>

              <button
                type="button"
                onClick={() => setResultTab('review')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                  resultTab === 'review'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📝 Question Explanations ({result.answers?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/student/assessments')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition"
              >
                Return to Assessments
              </button>
            </div>
          </div>

          {/* Tab 1: Live Assessment Leaderboard */}
          {resultTab === 'leaderboard' && (
            <div className="rounded-3xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-900">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Live Cohort Leaderboard</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Rankings dynamically calculated from student scores
                </span>
              </div>
              <AssessmentLeaderboardView
                assessmentId={examData?.assessment?.id || assessmentId}
                assessmentTitle={result.assessmentTitle}
                showHeader={false}
              />
            </div>
          )}

          {/* Tab 2: Itemized Question Review */}
          {resultTab === 'review' && (
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
          )}
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
      {mobileAlertModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/80 animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                {mobileAlertModal.isTerminated
                  ? 'Exam Terminated • Strike 2 of 2'
                  : 'Critical Warning • Mobile Strike 1 of 2'}
              </span>
              <h2 className="text-2xl font-black text-white">
                {mobileAlertModal.isTerminated
                  ? 'Exam Terminated: Mobile Limit Exceeded'
                  : 'Mobile Device Detected (Warning 1/2)'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {mobileAlertModal.isTerminated ? (
                  'A mobile phone was detected in camera view for the 2nd time. In accordance with strict examination regulations, your assessment has been automatically terminated and submitted.'
                ) : (
                  <>
                    The AI proctoring system detected a <strong className="text-rose-400">cell phone / mobile device</strong> in camera view. Secondary electronic devices are strictly prohibited. <strong className="text-rose-300 block mt-1.5">THIS IS YOUR 1ST WARNING. If a mobile device is detected again, your exam will be automatically terminated immediately!</strong>
                  </>
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-medium">
              ⚠️ This incident has been logged with camera telemetry and timestamp in the Faculty Proctoring Audit Console.
            </div>

            {mobileAlertModal.isTerminated ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-400 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizing automatic exam submission...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={dismissMobileAlert}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Put Away the Mobile Device (Warning 1/2)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Unauthorized Person / Multiple Faces Blocker Overlay */}
      {unauthorizedPerson && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/80 animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              {unauthorizedPerson === 'MULTIPLE_FACES' ? (
                <Users className="w-10 h-10" />
              ) : (
                <UserX className="w-10 h-10" />
              )}
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Exam Screen Blurred • Security Lock
              </span>
              <h2 className="text-2xl font-black text-white">
                {unauthorizedPerson === 'MULTIPLE_FACES'
                  ? 'Multiple People Detected in Camera'
                  : 'Unauthorized Person Detected'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {unauthorizedPerson === 'MULTIPLE_FACES'
                  ? 'More than one individual was detected in your camera view. The exam screen is blurred to prevent unauthorized assistance. Please ensure only you are present.'
                  : 'The person in camera view does not match the baseline reference photo captured at exam start. Exam content is blurred until the authorized student returns.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400 shrink-0" />
              <span>Scanning camera feed... Screen will unblur automatically when only the enrolled candidate is in view.</span>
            </div>

            {baselineSnapshot && (
              <div className="pt-2 flex items-center justify-center gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                <img
                  src={baselineSnapshot}
                  alt="Enrolled Candidate"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                />
                <div className="text-left text-xs">
                  <span className="text-emerald-400 font-bold block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled Candidate
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Only this verified candidate is authorized to take this assessment.
                  </span>
                </div>
              </div>
            )}
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
          <span className={`flex items-center gap-1.5 font-bold ${unauthorizedPerson ? 'text-rose-400' : 'text-emerald-400'}`}>
            <span className={`w-2 h-2 rounded-full ${unauthorizedPerson ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            {unauthorizedPerson ? 'Security Alert' : facePresent ? 'Proctoring Active' : 'Face Alert'}
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
          <>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video
                ref={livePipVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
              {unauthorizedPerson ? (
                <div className="absolute inset-0 bg-rose-950/85 flex items-center justify-center p-2 text-center text-[10px] text-rose-200 font-bold">
                  {unauthorizedPerson === 'MULTIPLE_FACES' ? '⚠️ Multiple Faces' : '⚠️ Identity Mismatch'}
                </div>
              ) : !facePresent && (
                <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center p-2 text-center text-[10px] text-rose-200 font-bold">
                  ⚠️ Face Not In Frame
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 pt-0.5">
              <span className={`flex items-center gap-1 font-medium ${unauthorizedPerson ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                {unauthorizedPerson ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>Screen Blurred</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Candidate Verified</span>
                  </>
                )}
              </span>
              <span className="text-cyan-400 font-mono text-[8px] uppercase tracking-wider font-bold">
                📱 Device Scan: ON
              </span>
            </div>
          </>
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
      <div
        className={`flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all duration-300 ${
          unauthorizedPerson
            ? 'filter blur-2xl pointer-events-none select-none opacity-20'
            : ''
        }`}
      >
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
