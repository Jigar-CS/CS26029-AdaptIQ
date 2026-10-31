'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PenTool,
  Copy,
  Activity,
  Radio,
  Wifi,
  Fingerprint,
  Scan,
  QrCode,
} from 'lucide-react';
import { AssessmentLeaderboardView } from '@/components/AssessmentLeaderboardModal';
import { DescriptiveCompanionWorkspace } from '@/components/DescriptiveCompanionWorkspace';

interface FaceFeatureProfile {
  descriptor?: number[]; // 128-d deep facial biometric descriptor vector (ResNet / ArcFace)
  grid: number[][]; // 8x8 normalized [r, g, b] cells
  colorHist: number[]; // 16-bin color distribution
  gradientProfile?: number[]; // 16-bin structural edge orientation gradients
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
    const gradientProfile = new Array(16).fill(0);
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

        // Sobel edge gradient to capture invariant facial feature geometry
        if (x > 0 && x < sw - 1 && y > 0 && y < sh - 1) {
          const leftIdx = (y * sw + (x - 1)) * 4;
          const rightIdx = (y * sw + (x + 1)) * 4;
          const upIdx = ((y - 1) * sw + x) * 4;
          const downIdx = ((y + 1) * sw + x) * 4;
          const dx = Math.abs(data[rightIdx] - data[leftIdx]);
          const dy = Math.abs(data[downIdx] - data[upIdx]);
          const gradBin = Math.min(15, Math.floor((dx + dy) / 16));
          gradientProfile[gradBin]++;
        }

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
    const gradTotal = gradientProfile.reduce((a, b) => a + b, 0) || 1;
    const normalizedGrad = gradientProfile.map((v) => v / gradTotal);

    return {
      grid: normalizedGrid,
      colorHist: normalizedHist,
      gradientProfile: normalizedGrad,
      skinRatio: skinCount / totalPixels,
      avgBrightness: totalBrightness / totalPixels,
    };
  } catch {
    return null;
  }
}

function compareFaceProfiles(p1: FaceFeatureProfile, p2: FaceFeatureProfile): number {
  if (!p1 || !p2) return 0;

  // 1. High-Precision 128-d Deep Biometric Embedding Distance (ResNet / ArcFace)
  if (
    Array.isArray(p1.descriptor) &&
    Array.isArray(p2.descriptor) &&
    p1.descriptor.length === 128 &&
    p2.descriptor.length === 128
  ) {
    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
      const diff = p1.descriptor[i] - p2.descriptor[i];
      sumSq += diff * diff;
    }
    const dist = Math.sqrt(sumSq);
    // Face-API standard:
    // Distance < 0.58 indicates same person. Distance >= 0.65 indicates different person/imposter.
    const sim = Math.max(0, 1 - dist / 0.70);
    return sim;
  }

  // 2. Structural Edge Gradient Cosine Similarity
  let gradSim = 0;
  if (p1.gradientProfile && p2.gradientProfile) {
    let gDot = 0, gMag1 = 0, gMag2 = 0;
    for (let i = 0; i < p1.gradientProfile.length; i++) {
      gDot += p1.gradientProfile[i] * p2.gradientProfile[i];
      gMag1 += p1.gradientProfile[i] * p1.gradientProfile[i];
      gMag2 += p2.gradientProfile[i] * p2.gradientProfile[i];
    }
    gradSim = gMag1 > 0 && gMag2 > 0 ? gDot / (Math.sqrt(gMag1) * Math.sqrt(gMag2)) : 0;
  }

  // 3. Spatial Grid Cosine Similarity
  let dot = 0, mag1 = 0, mag2 = 0;
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

  // 4. Color Histogram Cosine Similarity
  let hDot = 0, hMag1 = 0, hMag2 = 0;
  for (let i = 0; i < p1.colorHist.length; i++) {
    hDot += p1.colorHist[i] * p2.colorHist[i];
    hMag1 += p1.colorHist[i] * p1.colorHist[i];
    hMag2 += p2.colorHist[i] * p2.colorHist[i];
  }
  const histSim = hMag1 > 0 && hMag2 > 0 ? hDot / (Math.sqrt(hMag1) * Math.sqrt(hMag2)) : 0;

  // Prioritize structural gradients over raw surface color
  if (gradSim > 0) {
    return gradSim * 0.50 + gridSim * 0.30 + histSim * 0.20;
  }

  return gridSim * 0.55 + histSim * 0.45;
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
  // ---------------------------------------------------------------------------
  // Descriptive Answer Companion & Exit Pass State
  // ---------------------------------------------------------------------------
  const [descriptiveStrokeCounts, setDescriptiveStrokeCounts] = useState<Record<string, number>>({});
  const [exitPassCode, setExitPassCode] = useState<string | null>(null);
  const [showExitPassModal, setShowExitPassModal] = useState<boolean>(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState<boolean>(false);
  const isSubmittingExamRef = useRef<boolean>(false);
  const examEnterTimeRef = useRef<number>(Date.now());
  const [preflightMobileConnected, setPreflightMobileConnected] = useState<boolean>(false);
  const [preflightCheckingMobile, setPreflightCheckingMobile] = useState<boolean>(false);
  // Helper to determine clean default host without unwanted ports on cloud deployments
  const getDefaultPairingHost = (): string => {
    if (typeof window === 'undefined') return 'localhost:4000';
    const { hostname, host, protocol } = window.location;
    if (protocol === 'https:' || hostname.includes('onrender.com') || hostname.includes('vercel.app')) {
      return host;
    }
    return `${hostname}:4000`;
  };

  const [pairingHost, setPairingHost] = useState<string>(getDefaultPairingHost);
  const pairingHostRef = useRef<string>(getDefaultPairingHost());
  pairingHostRef.current = pairingHost;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const isCodingTest = Boolean(
    examData?.questions?.some((q: any) => q.type === 'CODING' || q.codingProblem)
  );

  const isDescriptiveTest = Boolean(
    examData?.assessment?.examMode === 'DESCRIPTIVE' ||
    examData?.questions?.some((q: any) => q.type === 'SHORT_ANSWER' || q.type === 'DESCRIPTIVE')
  );

  const isCodeBasedExam = Boolean(
    examData?.assessment?.examMode === 'CODING' ||
    examData?.assessment?.examMode === 'HYBRID' ||
    isCodingTest
  );

  const isDescriptiveExam = Boolean(
    !isCodeBasedExam && (
      examData?.assessment?.examMode === 'DESCRIPTIVE' ||
      isDescriptiveTest
    )
  );

  const isMcqExam = !isCodeBasedExam && !isDescriptiveExam;

  // Fullscreen exit policy quotas:
  // - MCQ type: 3 times allowed
  // - Descriptive: 1 time allowed
  // - Code based: 0 times allowed
  const maxFullscreenExits = isCodeBasedExam ? 0 : isDescriptiveExam ? 1 : 3;
  const examTypeFullscreenLabel = isCodeBasedExam ? 'Code-based' : isDescriptiveExam ? 'Descriptive' : 'MCQ';

  const companionSession =
    examData?.companionPairingPinRaw ||
    examData?.companionSessionToken ||
    'clias-session-9842';

  const companionPinDisplay =
    examData?.companionPairingPin ||
    (examData?.companionSessionToken && /^\d{6}$/.test(examData.companionSessionToken)
      ? `${examData.companionSessionToken.slice(0, 3)}-${examData.companionSessionToken.slice(3)}`
      : (examData?.companionPairingPinRaw && /^\d{6}$/.test(examData.companionPairingPinRaw)
          ? `${examData.companionPairingPinRaw.slice(0, 3)}-${examData.companionPairingPinRaw.slice(3)}`
          : companionSession));

  // Smart WebSocket URL builder that guarantees secure wss: on HTTPS and strips invalid port 4000
  const getCompanionWsUrl = (sessionId: string, hostOverride?: string): string => {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let host = hostOverride || (typeof window !== 'undefined' ? window.location.host : 'localhost:4000');
    host = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isCloud = isHttps || host.includes('onrender.com') || host.includes('vercel.app');
    if (isCloud && host.includes(':4000')) {
      host = host.replace(':4000', '');
    }
    const wsProto = isCloud ? 'wss:' : 'ws:';
    return `${wsProto}//${host}/companion?role=viewer&sessionId=${encodeURIComponent(sessionId)}`;
  };

  const isPollingCompanionRef = useRef(false);

  const checkMobileStatus = React.useCallback(
    async (showManualSpinner = false) => {
      if (isPollingCompanionRef.current) return;
      if (!companionSession || companionSession === 'clias-session-9842') return;
      isPollingCompanionRef.current = true;
      if (showManualSpinner) {
        setPreflightCheckingMobile(true);
      }
      try {
        const res = await fetch(
          `/api/v1/companion/status?sessionId=${encodeURIComponent(companionSession)}`
        );
        if (res.ok) {
          const data = await res.json();
          const connected = Boolean(data.mobileConnected);
          setPreflightMobileConnected((prev) => (prev !== connected ? connected : prev));
          const pubHost = data?.publicHost;
          if (pubHost) {
            setPairingHost((prev) => (prev !== pubHost ? pubHost : prev));
          } else if (data?.localIp) {
            const localHost = `${data.localIp}:4000`;
            setPairingHost((prev) => (prev !== localHost ? localHost : prev));
          }
        }
      } catch {
        // ignore network errors during preflight
      } finally {
        isPollingCompanionRef.current = false;
        if (showManualSpinner) {
          setPreflightCheckingMobile(false);
        }
      }
    },
    [companionSession]
  );

  // Phase 9: AI Proctoring & Multi-Modal Telemetry State
  const [showPreFlight, setShowPreFlight] = useState(true);

  // Monitor phone companion connectivity during PreFlight for descriptive tests
  useEffect(() => {
    if (typeof window === 'undefined' || !isDescriptiveTest || !showPreFlight) return;
    if (!companionSession || companionSession === 'clias-session-9842') return;

    checkMobileStatus(false);
    const interval = setInterval(() => {
      checkMobileStatus(false);
    }, preflightMobileConnected ? 4000 : 2000);

    const wsUrl = getCompanionWsUrl(companionSession, pairingHostRef.current);
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'INITIAL_STATE') {
              const isConn = msg.mobileStatus === 'connected';
              setPreflightMobileConnected(isConn);
            } else if (msg.type === 'MOBILE_STATUS') {
              const isConn = msg.status === 'connected';
              setPreflightMobileConnected(isConn);
            }
          } catch {}
        };
        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimer = setTimeout(connectWs, 2500);
          }
        };
        ws.onerror = () => {};
      } catch {}
    };

    connectWs();

    return () => {
      isDisposed = true;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      } catch {}
    };
  }, [isDescriptiveTest, showPreFlight, companionSession, checkMobileStatus]);

  // ---------------------------------------------------------------------------
  // Phase 9: AI Proctoring & Multi-Modal Telemetry State
  // ---------------------------------------------------------------------------
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
  const [fullscreenTerminated, setFullscreenTerminated] = useState(false);
  const [fullscreenStrikeCount, setFullscreenStrikeCount] = useState<number>(0);
  const fullscreenStrikeCountRef = useRef<number>(0);
  const lastFullscreenExitTimeRef = useRef<number>(0);
  const [fullscreenAlertModal, setFullscreenAlertModal] = useState<{
    show: boolean;
    strike: number;
    maxAllowed: number;
    isTerminated: boolean;
    examTypeLabel: string;
    reason: string;
  } | null>(null);
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
  const [tabSwitchStrikeCount, setTabSwitchStrikeCount] = useState<number>(0);
  const tabSwitchStrikeCountRef = useRef<number>(0);
  const lastTabSwitchTimeRef = useRef<number>(0);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [tabSwitchAlertModal, setTabSwitchAlertModal] = useState<{
    show: boolean;
    strike: number;
    maxStrikes: number;
    isCodingTest: boolean;
    isTerminated: boolean;
    reason: string;
  } | null>(null);

  const [mobileAlertModal, setMobileAlertModal] = useState<{
    show: boolean;
    strike: number;
    isTerminated: boolean;
  } | null>(null);
  const mobileStrikeCountRef = useRef<number>(0);
  const lastMobileStrikeTimeRef = useRef<number>(0);

  // Baseline Identity Verification & Continuous Multi-Person Detection States
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  const baselineSnapshotRef = useRef<string | null>(null);
  const [faceEnrollmentFeedback, setFaceEnrollmentFeedback] = useState<
    'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'SUCCESS_VERIFIED' | 'LOW_CONFIDENCE' | 'MODEL_LOADING' | 'DB_MISMATCH' | null
  >(null);
  const [dbBiometricsMatchInfo, setDbBiometricsMatchInfo] = useState<{
    matched: boolean;
    distance: number;
    confidence: number;
    angle?: string;
  } | null>(null);
  const dbFaceDescriptorsRef = useRef<{ angle: string; descriptor: Float32Array }[]>([]);
  const [faceModelStatus, setFaceModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [unauthorizedPerson, setUnauthorizedPerson] = useState<'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null>(null);
  const unauthorizedPersonRef = useRef<'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null>(null);
  const baselineFaceProfileRef = useRef<FaceFeatureProfile | null>(null);
  const baselineFaceDescriptorRef = useRef<Float32Array | null>(null);
  const faceApiModelLoadedRef = useRef<boolean>(false);
  const lastBlinkTimeRef = useRef<number>(Date.now());
  const eyeBlinkCounterRef = useRef<number>(0);
  const isEyeClosedRef = useRef<boolean>(false);
  const lastHeadPoseViolationTimeRef = useRef<number>(0);
  const [virtualCamWarning, setVirtualCamWarning] = useState<string | null>(null);
  const [multiMonitorWarning, setMultiMonitorWarning] = useState<string | null>(null);
  const consecutiveMismatchRef = useRef<number>(0);
  const consecutiveUnauthorizedRef = useRef<number>(0);
  const consecutiveMobileDetectionRef = useRef<number>(0);

  const updateUnauthorizedPerson = (val: 'MULTIPLE_FACES' | 'IDENTITY_MISMATCH' | null) => {
    unauthorizedPersonRef.current = val;
    setUnauthorizedPerson(val);
  };

  const preflightVideoRef = useRef<HTMLVideoElement>(null);
  const livePipVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  mediaStreamRef.current = mediaStream;

  const attachPreflightVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      preflightVideoRef.current = node;
      if (node) {
        node.muted = true;
        node.defaultMuted = true;
        if (mediaStream) {
          if (node.srcObject !== mediaStream) {
            node.srcObject = mediaStream;
          }
          node.play().catch(() => {});
        }
      }
    },
    [mediaStream]
  );

  const attachLivePipVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      livePipVideoRef.current = node;
      if (node) {
        node.muted = true;
        node.defaultMuted = true;
        if (mediaStream) {
          if (node.srcObject !== mediaStream) {
            node.srcObject = mediaStream;
          }
          node.play().catch(() => {});
        }
      }
    },
    [mediaStream]
  );
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  const consecutiveFaceAbsentRef = useRef<number>(0);
  const faceModalActiveRef = useRef<boolean>(false);
  const faceStrikeCountRef = useRef<number>(0);
  const isAutoSubmittingRef = useRef<boolean>(false);
  const visionModelRef = useRef<any>(null);
  const isDetectingRef = useRef<boolean>(false);
  const detectionCycleRef = useRef<number>(0);

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

  // Listen for question switches initiated remotely from paired mobile companion (during active exam)
  useEffect(() => {
    if (typeof window === 'undefined' || !examData || showPreFlight) return;
    const sId = examData.submissionId || examData.assessment?.id;
    if (!sId) return;

    const wsUrl = getCompanionWsUrl(sId, pairingHostRef.current);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ACTIVE_QUESTION_CHANGED' && msg.questionId) {
            const num = parseInt(msg.questionId.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num >= 1 && num <= (examData.questions?.length || 5)) {
              setCurrentIdx(num - 1);
            }
          }
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}

    return () => {
      try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      } catch {}
    };
  }, [examData, showPreFlight]);

  // Clean up media streams and audio context ONLY on component unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Connect media stream to video elements whenever stream or DOM elements mount/update
  useEffect(() => {
    if (!mediaStream) return;
    const attachAndPlay = (video: HTMLVideoElement | null) => {
      if (!video) return;
      video.muted = true;
      video.defaultMuted = true;
      if (video.srcObject !== mediaStream) {
        video.srcObject = mediaStream;
      }
      video.play().catch(() => {});
    };

    attachAndPlay(preflightVideoRef.current);
    attachAndPlay(livePipVideoRef.current);
  }, [mediaStream, showPreFlight, pipMinimized, loading, cameraPermission]);

  const startAssessment = async () => {
    setLoading(true);
    try {
      const data = await api.post(`/assessments/${assessmentId}/start`);
      setExamData(data);
      setSecondsRemaining(data.remainingSeconds || data.assessment.durationMinutes * 60);
      if (typeof data.trustScore === 'number') {
        setTrustScore(data.trustScore);
      }
      // Require explicit live face capture & DB verification before starting
      setFaceEnrolled(false);
      setFaceEnrollmentFeedback(null);
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

      // If descriptive test, wipe any stale strokes and register real questions
      const isDescriptive = Boolean(
        data.assessment?.examMode === 'DESCRIPTIVE' ||
        data.questions?.some((q: any) => q.type === 'SHORT_ANSWER' || q.type === 'DESCRIPTIVE')
      );
      if (isDescriptive) {
        fetch(`/api/v1/companion/reset?sessionId=${encodeURIComponent(companionSession)}`, { method: 'POST' }).catch(() => {});
        const qList = (data.questions || []).map((q: any, i: number) => ({
          id: `Q${i + 1}`,
          label: `Q${i + 1}`,
          title: `Q${i + 1}: ${q.topicName || q.questionText?.slice(0, 35) || 'Descriptive Question'}`,
        }));
        fetch('/api/v1/companion/register-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: companionSession, questions: qList }),
        }).catch(() => {});
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

      // Immediately connect to video element if already rendered
      if (preflightVideoRef.current) {
        preflightVideoRef.current.muted = true;
        preflightVideoRef.current.defaultMuted = true;
        preflightVideoRef.current.srcObject = stream;
        preflightVideoRef.current.play().catch(() => {});
      }
      if (livePipVideoRef.current) {
        livePipVideoRef.current.muted = true;
        livePipVideoRef.current.defaultMuted = true;
        livePipVideoRef.current.srcObject = stream;
        livePipVideoRef.current.play().catch(() => {});
      }

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

      // Detect virtual camera drivers / fake media injectors
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        const blockedKeywords = ['obs', 'virtual', 'manycam', 'vmix', 'fake', 'droidcam', 'iriun', 'camo', 'splitcam'];
        const foundVirtual = videoDevices.find((v) =>
          blockedKeywords.some((b) => v.label.toLowerCase().includes(b))
        );
        if (foundVirtual && videoDevices.length > 1) {
          console.warn('Virtual camera driver detected:', foundVirtual.label);
          setVirtualCamWarning(`Virtual camera detected: "${foundVirtual.label}". Please ensure your primary physical webcam is selected.`);
        } else {
          setVirtualCamWarning(null);
        }
      } catch {}

      // Multi-monitor detection
      if (typeof window !== 'undefined' && ((window.screen as any)?.isExtended || (window as any).screenDetails)) {
        setMultiMonitorWarning('Multiple monitors detected. Extended secondary screens are monitored.');
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

  const extractDescriptorFromSnapshot = async (
    source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): Promise<Float32Array | null> => {
    const faceapi = (window as any).faceapi;
    if (!faceapi || !faceApiModelLoadedRef.current) return null;
    try {
      let det = await faceapi
        .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.28 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det?.descriptor) {
        det = await faceapi
          .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.20 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
      }

      if (det?.descriptor) {
        return det.descriptor;
      }
    } catch (err) {
      console.warn('Face biometric descriptor extraction error:', err);
    }
    return null;
  };

  // Helper to extract or parse DB biometric descriptors
  const loadDbBiometrics = async () => {
    if (dbFaceDescriptorsRef.current.length > 0) return dbFaceDescriptorsRef.current;
    let bio = examData?.dbBiometrics;
    if (!bio || (!bio.faceFrontSnapshot && !bio.faceDescriptorFront)) {
      try {
        const me = await api.get('/auth/me');
        const prof = me?.studentProfile || me?.userProfile;
        if (prof?.faceFrontSnapshot || prof?.faceDescriptorFront) {
          bio = {
            enrolled: true,
            faceFrontSnapshot: prof.faceFrontSnapshot,
            faceLeftSnapshot: prof.faceLeftSnapshot,
            faceRightSnapshot: prof.faceRightSnapshot,
            faceDescriptorFront: prof.faceDescriptorFront,
            faceDescriptorLeft: prof.faceDescriptorLeft,
            faceDescriptorRight: prof.faceDescriptorRight,
          };
        }
      } catch (_) {}
    }
    if (!bio) return [];

    const list: { angle: string; descriptor: Float32Array }[] = [];
    const fields = [
      { angle: 'Front', desc: bio.faceDescriptorFront, snap: bio.faceFrontSnapshot },
      { angle: 'Left', desc: bio.faceDescriptorLeft, snap: bio.faceLeftSnapshot },
      { angle: 'Right', desc: bio.faceDescriptorRight, snap: bio.faceRightSnapshot },
    ];

    for (const f of fields) {
      if (f.desc) {
        try {
          const parsed = typeof f.desc === 'string' ? JSON.parse(f.desc) : f.desc;
          if (Array.isArray(parsed) && parsed.length > 0) {
            list.push({ angle: f.angle, descriptor: new Float32Array(parsed) });
            continue;
          }
        } catch (e) {}
      }
      if (f.snap) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = f.snap;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          const desc = await extractDescriptorFromSnapshot(img);
          if (desc) list.push({ angle: f.angle, descriptor: desc });
        } catch {}
      }
    }

    dbFaceDescriptorsRef.current = list;
    return list;
  };

  const handleCaptureFace = async () => {
    if (!examData?.submissionId) return;
    const video = preflightVideoRef.current;
    if (!video) {
      alert('Camera feed is still initializing. Please wait a moment and try again.');
      return;
    }

    // Ensure camera stream is attached and playing
    if (mediaStream && video.srcObject !== mediaStream) {
      video.muted = true;
      video.defaultMuted = true;
      video.srcObject = mediaStream;
      try {
        await video.play();
      } catch {}
    }

    if (video.paused) {
      try {
        await video.play();
      } catch {}
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Brief grace period for video frame settling
      await new Promise((r) => setTimeout(r, 250));
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      try {
        await video.play();
        await new Promise((r) => setTimeout(r, 200));
      } catch {}
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera feed is still initializing. Please wait a moment and try again.');
      return;
    }

    setEnrollingFace(true);
    setFaceEnrollmentFeedback(null);
    setDbBiometricsMatchInfo(null);
    try {
      // 1. Capture high-fidelity frame to canvas for deep neural descriptor extraction
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.90);

      // Fast structural gradient profile fallback (< 2ms)
      const sx = Math.floor(width * 0.15);
      const sy = Math.floor(height * 0.10);
      const sw = Math.floor(width * 0.70);
      const sh = Math.floor(height * 0.80);
      const profile = extractFaceProfileFromCanvas(canvas, sx, sy, sw, sh);
      if (profile) {
        baselineFaceProfileRef.current = profile;
      }

      // Check if Face-API models are loaded. If not yet loaded, wait up to 5 seconds
      if (!faceApiModelLoadedRef.current) {
        setFaceEnrollmentFeedback('MODEL_LOADING');
        let waited = 0;
        while (!faceApiModelLoadedRef.current && waited < 5000) {
          await new Promise((r) => setTimeout(r, 250));
          waited += 250;
        }
      }

      const faceapi = (window as any).faceapi;
      if (!faceapi || !faceApiModelLoadedRef.current) {
        setFaceEnrollmentFeedback('MODEL_LOADING');
        setFaceEnrolled(false);
        alert('Biometric AI models are still initializing. Please wait 3 seconds and click "Capture Snapshot" again.');
        return;
      }

      // High-Precision Biometric Face Verification & 128-d Vector Extraction
      const faces = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.28 })
      );

      if (faces.length === 0) {
        // No face found in the captured camera frame
        setFaceEnrollmentFeedback('NO_FACE_DETECTED');
        setFaceEnrolled(false);
        baselineFaceDescriptorRef.current = null;
        return;
      }

      if (faces.length > 1) {
        // Multiple faces found in frame
        setFaceEnrollmentFeedback('MULTIPLE_FACES');
        setFaceEnrolled(false);
        baselineFaceDescriptorRef.current = null;
        return;
      }

      // Exactly 1 face found: Extract 128-d deep biometric descriptor
      const descriptor = await extractDescriptorFromSnapshot(canvas);
      if (!descriptor) {
        setFaceEnrollmentFeedback('LOW_CONFIDENCE');
        setFaceEnrolled(false);
        baselineFaceDescriptorRef.current = null;
        return;
      }

      // Match against institutional database biometric reference photos
      const dbList = await loadDbBiometrics();
      if (dbList.length > 0) {
        let minDistance = 1.0;
        let bestAngle = 'Front';
        for (const item of dbList) {
          const d = faceapi.euclideanDistance(descriptor, item.descriptor);
          if (d < minDistance) {
            minDistance = d;
            bestAngle = item.angle;
          }
        }

        const matched = minDistance < 0.58;
        const confidence = Math.max(0, Math.min(100, Math.round((1 - minDistance) * 100)));

        setDbBiometricsMatchInfo({
          matched,
          distance: minDistance,
          confidence,
          angle: bestAngle,
        });

        if (!matched) {
          // Identity mismatch with DB!
          setFaceEnrollmentFeedback('DB_MISMATCH');
          setFaceEnrolled(false);
          baselineFaceDescriptorRef.current = null;
          baselineSnapshotRef.current = null;
          setBaselineSnapshot(null);
          return;
        }
      }

      baselineFaceDescriptorRef.current = descriptor;
      baselineSnapshotRef.current = snapshotUrl;
      setBaselineSnapshot(snapshotUrl);
      if (baselineFaceProfileRef.current) {
        baselineFaceProfileRef.current.descriptor = Array.from(descriptor);
      }
      setFaceEnrollmentFeedback('SUCCESS_VERIFIED');
      setFaceEnrolled(true);

      // Dispatch face enrollment snapshot to backend immediately
      api.post(`/proctoring/sessions/${examData.submissionId}/enroll-face`, {
        snapshot: snapshotUrl,
      }).catch((err) => console.warn('Deferred enrollment sync notice:', err));

    } catch (err) {
      console.error('Face capture verification error:', err);
      setFaceEnrolled(false);
      setFaceEnrollmentFeedback('LOW_CONFIDENCE');
    } finally {
      setEnrollingFace(false);
    }
  };

  const handleConfirmAndEnterExam = async () => {
    if (!faceEnrolled || faceEnrollmentFeedback !== 'SUCCESS_VERIFIED' || !baselineFaceDescriptorRef.current) {
      alert('Strict Biometric Verification Required: You must capture and successfully match your face against your registered institutional database profile before entering the examination.');
      return;
    }

    if (isDescriptiveTest && !preflightMobileConnected) {
      alert('Phone companion must be paired and connected before starting this descriptive examination.');
      return;
    }

    if (isDescriptiveTest) {
      try {
        // Reset companion server session buffer so previous test's strokes are wiped
        await fetch(`/api/v1/companion/reset?sessionId=${encodeURIComponent(companionSession)}`, { method: 'POST' });
      } catch (err) {
        console.warn('Could not reset companion session:', err);
      }
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed or blocked:', e);
    }
    examEnterTimeRef.current = Date.now();
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
    if (!examData || result || showPreFlight || submitting || isSubmittingExamRef.current) return;

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
  // Pre-load Face-API & COCO-SSD immediately on mount for instant preflight verification
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    if (typeof window === 'undefined') return;

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
          }, 7000);
          document.head.appendChild(s);
        };
        tryNext();
      });
    };

    const loadVisionDetector = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Concurrently initialize Face-API and COCO-SSD for instant model readiness
        const initFaceApi = async () => {
          try {
            if (!(window as any).faceapi) {
              await loadScriptWithFallback([
                'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js',
                'https://unpkg.com/@vladmandic/face-api@1.7.12/dist/face-api.js',
              ]);
            }
            if (!active) return;
            const faceapi = (window as any).faceapi;
            if (active && faceapi && !faceApiModelLoadedRef.current) {
              const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
              await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
              if (!active) return;
              await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
              if (!active) return;
              await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

              if (active) {
                faceApiModelLoadedRef.current = true;
                setFaceModelStatus('ready');
                console.log('AI Face Biometric Models loaded successfully.');
                loadDbBiometrics().catch(() => {});
              }
            }
          } catch (e) {
            console.warn('Face-api load error:', e);
          }
        };

        const initCocoSsd = async () => {
          try {
            if (!(window as any).tf) {
              await loadScriptWithFallback([
                'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
                'https://unpkg.com/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/tensorflow/4.17.0/tf.min.js',
              ]);
            }
            if (!active) return;

            if (!(window as any).cocoSsd) {
              await loadScriptWithFallback([
                'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
                'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
              ]);
            }
            if (!active) return;

            if (active && (window as any).cocoSsd && !visionModelRef.current) {
              const m = await (window as any).cocoSsd.load({ base: 'lite_mobilenet_v2' });
              if (active) {
                visionModelRef.current = m;
                // Pre-warm WebGL shaders on dummy canvas so 1st real frame takes ~25ms
                try {
                  const warmup = document.createElement('canvas');
                  warmup.width = 160;
                  warmup.height = 120;
                  await m.detect(warmup);
                } catch {}
                console.log('AI Proctoring Vision Model (COCO-SSD) primed & warmed up.');
              }
            }
          } catch (e) {
            console.warn('COCO-SSD load error:', e);
          }
        };

        await Promise.allSettled([initFaceApi(), initCocoSsd()]);
      } catch (err) {
        console.warn('Vision model initialization error:', err);
      }
    };

    loadVisionDetector();
    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Secure Browser Lockdown: Clipboard, Right-Click, and DevTools Protection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (!isCodingTest) {
        e.preventDefault();
        reportViolation('WINDOW_BLUR', 'LOW', 'Clipboard action (copy/paste) blocked during examination.');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
        reportViolation('TAB_SWITCH', 'MEDIUM', 'Prohibited developer tool shortcut combination blocked.');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [examData, result, showPreFlight, isCodingTest]);

  // ---------------------------------------------------------------------------
  // Real-Time Browser Integrity Monitoring Listeners
  // ---------------------------------------------------------------------------
  const handleSwitchQuestion = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setRunOutput(null);
    const qLabel = `Q${idx + 1}`;
    fetch(`/api/v1/companion/switch-question?sessionId=${encodeURIComponent(companionSession)}&questionId=${qLabel}`, {
      method: 'POST',
    }).catch(() => {});
  }, [companionSession]);

  const handleCompanionActiveQuestionChange = useCallback((qNum: number) => {
    handleSwitchQuestion(qNum - 1);
  }, [handleSwitchQuestion]);

  const handleStrokeCountChange = useCallback((qId: string, count: number) => {
    setDescriptiveStrokeCounts((prev) => {
      if (prev[qId] === count) return prev;
      return {
        ...prev,
        [qId]: count,
      };
    });
  }, []);

  const handleDismissTabSwitchModal = () => {
    if (tabSwitchAlertModal?.isTerminated) return;
    setTabSwitchAlertModal(null);
    setIsWindowBlurred(false);
    lastTabSwitchTimeRef.current = Date.now();
    if (!document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch {}
    }
  };

  const handleTabOrWindowSwitch = (trigger: 'TAB_SWITCH' | 'WINDOW_BLUR') => {
    if (isAutoSubmittingRef.current || result || showPreFlight || submitting || isSubmittingExamRef.current) return;

    // Debounce to prevent dual strikes from a single Alt+Tab action (blur + visibilitychange)
    const now = Date.now();
    if (now - lastTabSwitchTimeRef.current < 2000) return;
    lastTabSwitchTimeRef.current = now;

    // Standard 3-Strike Warning Architecture:
    // Strikes 1, 2, 3 show warning modal & penalize integrity score.
    // 4th violation automatically terminates and submits the exam.
    tabSwitchStrikeCountRef.current += 1;
    const currentStrike = tabSwitchStrikeCountRef.current;
    setTabSwitchStrikeCount(currentStrike);

    if (currentStrike >= 4) {
      isAutoSubmittingRef.current = true;
      setTabSwitchTerminated(true);
      setTabSwitchAlertModal({
        show: true,
        strike: 4,
        maxStrikes: 3,
        isCodingTest: false,
        isTerminated: true,
        reason:
          'You navigated away from the exam window (Alt+Tab / application switch) 4 times despite 3 prior integrity warnings. In accordance with examination regulations, your assessment has been automatically terminated and submitted.',
      });
      reportViolation(
        'TAB_SWITCH',
        'SEVERE',
        '4th Tab/Window Switch Violation: Student exceeded the 3-warning limit. Exam automatically submitted.'
      );
      submitExam();
    } else {
      const isFinal = currentStrike === 3;
      setTabSwitchAlertModal({
        show: true,
        strike: currentStrike,
        maxStrikes: 3,
        isCodingTest: false,
        isTerminated: false,
        reason: isFinal
          ? 'You navigated away from the exam window (Alt+Tab / application switch). THIS IS YOUR FINAL WARNING (Strike 3 of 3)! If you switch away one more time, your exam will be terminated immediately!'
          : `You navigated away from the exam window (Alt+Tab / application switch). Warning ${currentStrike} of 3. You have ${3 - currentStrike} warning(s) remaining. On the 4th violation, your test will be terminated automatically.`,
      });
      reportViolation(
        'TAB_SWITCH',
        isFinal ? 'SEVERE' : currentStrike === 2 ? 'HIGH' : 'MEDIUM',
        `Tab/Window Switch Strike ${currentStrike}/3: Student switched away from exam window.`
      );
    }
  };

  useEffect(() => {
    if (!examData || result || showPreFlight) return;

    // 1. Tab Switching Detection (Alt+Tab or Tab Switch)
    const handleVisibilityChange = () => {
      if (submitting || isSubmittingExamRef.current || result) return;
      if (document.hidden) {
        setIsWindowBlurred(true);
        handleTabOrWindowSwitch('TAB_SWITCH');
      } else {
        setIsWindowBlurred(false);
      }
    };

    // 2. Window Blur (Switching Apps, Alt+Tab, or Opening Screen Capture tools)
    const handleWindowBlur = () => {
      if (submitting || isSubmittingExamRef.current || result) return;
      if (Date.now() - examEnterTimeRef.current < 4000) return;
      if (document.hasFocus()) return;
      setIsWindowBlurred(true);
      handleTabOrWindowSwitch('WINDOW_BLUR');
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    // 3. Fullscreen Exit Enforcement with Strict Exam-Mode Quotas:
    // - MCQ: 3 exits allowed; 4th exit terminates assessment
    // - Descriptive: 1 exit allowed; 2nd exit terminates assessment
    // - Code based: 0 exits allowed; 1st exit terminates assessment
    const handleFullscreenChange = () => {
      if (submitting || isSubmittingExamRef.current || result || isAutoSubmittingRef.current || showPreFlight) return;
      if (Date.now() - examEnterTimeRef.current < 4000) return;

      if (!document.fullscreenElement) {
        // Debounce browser event duplicates
        const now = Date.now();
        if (now - lastFullscreenExitTimeRef.current < 1500) return;
        lastFullscreenExitTimeRef.current = now;

        fullscreenStrikeCountRef.current += 1;
        const currentStrike = fullscreenStrikeCountRef.current;
        setFullscreenStrikeCount(currentStrike);
        setIsFullscreenExited(true);

        const isCodeBased = Boolean(
          examData?.assessment?.examMode === 'CODING' ||
          examData?.assessment?.examMode === 'HYBRID' ||
          isCodingTest
        );
        const isDescriptive = Boolean(
          !isCodeBased && (
            examData?.assessment?.examMode === 'DESCRIPTIVE' ||
            isDescriptiveTest
          )
        );

        const maxAllowed = isCodeBased ? 0 : isDescriptive ? 1 : 3;
        const typeLabel = isCodeBased ? 'Code-based' : isDescriptive ? 'Descriptive' : 'MCQ';

        if (currentStrike > maxAllowed) {
          // EXCEEDED ALLOWED LIMIT -> TERMINATE AND AUTO-SUBMIT EXAM
          isAutoSubmittingRef.current = true;
          setFullscreenTerminated(true);

          const terminationReason = maxAllowed === 0
            ? 'Code-based assessments strictly permit 0 fullscreen exits. Exiting mandatory fullscreen has resulted in the immediate termination and submission of your assessment.'
            : `You exited mandatory fullscreen ${currentStrike} times. ${typeLabel} assessments permit a maximum of ${maxAllowed} exit${maxAllowed === 1 ? '' : 's'}. In accordance with examination regulations, your assessment has been automatically terminated and submitted.`;

          setFullscreenAlertModal({
            show: true,
            strike: currentStrike,
            maxAllowed,
            isTerminated: true,
            examTypeLabel: typeLabel,
            reason: terminationReason,
          });

          reportViolation(
            'FULLSCREEN_EXIT',
            'SEVERE',
            `Fullscreen Exit Limit Exceeded (${currentStrike} exits > allowed ${maxAllowed} for ${typeLabel} exam). Assessment automatically terminated and submitted.`
          );

          submitExam();
        } else {
          // WITHIN ALLOWED LIMIT -> RECORD STRIKE AND ISSUE WARNING
          const isFinal = currentStrike === maxAllowed;
          const remaining = maxAllowed - currentStrike;

          const warningReason = isFinal
            ? `You exited mandatory fullscreen mode (${currentStrike} of ${maxAllowed} allowed for ${typeLabel} assessment). THIS IS YOUR FINAL WARNING! If you exit fullscreen again, your assessment will be terminated immediately!`
            : `You exited mandatory fullscreen mode (Exit ${currentStrike} of ${maxAllowed} allowed for ${typeLabel} assessment). You have ${remaining} exit warning${remaining === 1 ? '' : 's'} remaining. On any subsequent violation exceeding this limit, your test will be terminated automatically.`;

          setFullscreenAlertModal({
            show: true,
            strike: currentStrike,
            maxAllowed,
            isTerminated: false,
            examTypeLabel: typeLabel,
            reason: warningReason,
          });

          reportViolation(
            'FULLSCREEN_EXIT',
            isFinal ? 'SEVERE' : currentStrike >= 2 ? 'HIGH' : 'MEDIUM',
            `Fullscreen Exit Strike ${currentStrike}/${maxAllowed} (${typeLabel} exam).`
          );
        }
      } else {
        if (!fullscreenTerminated && !isAutoSubmittingRef.current) {
          setIsFullscreenExited(false);
          setFullscreenAlertModal(null);
        }
      }
    };

    const handleDismissFullscreenModal = async () => {
      if (fullscreenAlertModal?.isTerminated || fullscreenTerminated || isAutoSubmittingRef.current) return;
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Could not re-enter fullscreen:', e);
      }
      setIsFullscreenExited(false);
      setFullscreenAlertModal(null);
    };

    // 4. Strict Copy / Paste & Clipboard Blocking
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.clipboardData?.clearData();
      } catch {}
      try {
        navigator.clipboard?.writeText?.('');
      } catch {}
      reportViolation('WINDOW_BLUR', 'LOW', 'Unauthorized copy attempt prevented.');
      setWarningMessage('INTEGRITY ALERT: Copying assessment question or code text is strictly disabled.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setWarningMessage('INTEGRITY ALERT: Cut operation is disabled.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.clipboardData?.clearData();
      } catch {}
      reportViolation('WINDOW_BLUR', 'MEDIUM', 'Unauthorized paste attempt prevented.');
      setWarningMessage('INTEGRITY ALERT: Pasting external content or code into assessment is strictly prohibited.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setWarningMessage('INTEGRITY ALERT: Context menu is disabled during the proctored exam.');
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 5. Advanced Anti-Cheat Keyboard Shortcut & Screenshot Interceptor
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const keyLower = e.key ? e.key.toLowerCase() : '';

      // A. Screenshot Prevention: PrintScreen key (any modifier)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        setWarningMessage('INTEGRITY ALERT: Taking screenshots is strictly prohibited during proctored exams. Screen capture attempt recorded.');
        reportViolation('WINDOW_BLUR', 'HIGH', 'Screenshot attempt via PrintScreen key blocked.');
        return;
      }

      // B. Screenshot Prevention: Windows Snipping Tool (Win+Shift+S / Alt+PrtScn / Ctrl+Shift+S)
      if (
        (e.shiftKey && (cmdOrCtrl || e.altKey) && (keyLower === 's' || e.key === 'PrintScreen')) ||
        (e.altKey && e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        setWarningMessage('INTEGRITY ALERT: Screen capture shortcut is strictly disabled.');
        reportViolation('WINDOW_BLUR', 'HIGH', 'Screen capture shortcut Win/Alt/Shift+S blocked.');
        return;
      }

      // C. Screenshot Prevention: macOS shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        setWarningMessage('INTEGRITY ALERT: macOS screenshot shortcut is strictly disabled.');
        reportViolation('WINDOW_BLUR', 'HIGH', 'Mac screenshot shortcut Cmd+Shift+3/4/5 blocked.');
        return;
      }

      // D. Print Dialog Prevention: Ctrl+P / Cmd+P
      if (cmdOrCtrl && keyLower === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setWarningMessage('INTEGRITY ALERT: Printing exam content is strictly disabled.');
        reportViolation('WINDOW_BLUR', 'HIGH', 'Print dialog attempt blocked.');
        return;
      }

      // E. Copy / Paste / Cut Shortcuts:
      // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+S
      if (cmdOrCtrl && ['c', 'v', 'x', 'a', 'u', 's'].includes(keyLower)) {
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        setWarningMessage(`INTEGRITY ALERT: Keyboard shortcut Ctrl+${e.key.toUpperCase()} (Copy/Paste/Cut/Save) is disabled.`);
        reportViolation('WINDOW_BLUR', 'MEDIUM', `Unauthorized shortcut Ctrl+${e.key.toUpperCase()} blocked.`);
        return;
      }

      // F. Alternative Windows Copy / Paste Shortcuts (Insert keys)
      // Shift+Insert = Paste, Ctrl+Insert = Copy, Shift+Delete = Cut
      if (
        (e.shiftKey && (e.key === 'Insert' || e.key === 'Delete')) ||
        (cmdOrCtrl && e.key === 'Insert')
      ) {
        e.preventDefault();
        e.stopPropagation();
        setWarningMessage('INTEGRITY ALERT: Clipboard operation via Insert/Delete keys is disabled.');
        reportViolation('WINDOW_BLUR', 'MEDIUM', 'Clipboard operation via Insert key blocked.');
        return;
      }

      // G. Developer Tools: F12 and Ctrl+Shift+I/J/C
      if (
        e.key === 'F12' ||
        (cmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(keyLower))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setWarningMessage('INTEGRITY ALERT: Developer inspection tools are disabled.');
        reportViolation('WINDOW_BLUR', 'HIGH', 'Developer tools attempt blocked.');
        return;
      }
    };

    // Clear clipboard on PrintScreen release
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    window.addEventListener('paste', handlePaste, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [examData, result, showPreFlight]);

  // ---------------------------------------------------------------------------
  // Dedicated Ultra-Fast Handheld Mobile Phone Detector (Sub-Second 150ms Scan)
  // Operates on a lightweight 320x240 offscreen canvas buffer for instant (< 25ms) inference
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight || submitting || isSubmittingExamRef.current || !mediaStream) return;

    let timer: any = null;
    let isDisposed = false;
    let isDetectingPhone = false;
    const phoneCanvas = document.createElement('canvas');
    phoneCanvas.width = 320;
    phoneCanvas.height = 240;
    const phoneCtx = phoneCanvas.getContext('2d', { willReadFrequently: true });

    const runFastPhoneDetection = async () => {
      if (isDisposed) return;
      if (isDetectingPhone || isAutoSubmittingRef.current || submitting || isSubmittingExamRef.current || result) {
        if (!isDisposed) timer = setTimeout(runFastPhoneDetection, 150);
        return;
      }

      const video = livePipVideoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !visionModelRef.current || !phoneCtx) {
        if (!isDisposed) timer = setTimeout(runFastPhoneDetection, 200);
        return;
      }

      isDetectingPhone = true;
      try {
        phoneCtx.drawImage(video, 0, 0, 320, 240);
        // Explicitly pass minScore: 0.18 so COCO-SSD doesn't suppress predictions below default 0.50
        const predictions = await visionModelRef.current.detect(phoneCanvas, 10, 0.18);

        const phone = predictions.find((p: any) => {
          const c = (p.class || '').toLowerCase();
          if (
            c !== 'cell phone' &&
            c !== 'mobile phone' &&
            c !== 'telephone' &&
            c !== 'remote' &&
            !c.includes('phone') &&
            !c.includes('mobile')
          ) {
            return false;
          }
          return p.score >= 0.18;
        });

        if (phone && !isAutoSubmittingRef.current) {
          const confidence = Math.round(phone.score * 100);
          const detectionDetails = `AI Vision: Handheld mobile device detected in examination workstation (${confidence}% confidence).`;

          const now = Date.now();
          if (now - lastMobileStrikeTimeRef.current >= 3500) {
            lastMobileStrikeTimeRef.current = now;
            const nextStrike = mobileStrikeCountRef.current + 1;
            mobileStrikeCountRef.current = nextStrike;

            let snapshotUri = '';
            try {
              snapshotUri = phoneCanvas.toDataURL('image/jpeg', 0.65);
            } catch {}

            if (nextStrike === 1) {
              reportViolation(
                'MOBILE_PHONE_DETECTED',
                'SEVERE',
                detectionDetails,
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
      } catch (err) {
        // detection cycle safety
      } finally {
        isDetectingPhone = false;
        if (!isDisposed) {
          timer = setTimeout(runFastPhoneDetection, 150);
        }
      }
    };

    // Immediate start on exam entry (100ms)
    timer = setTimeout(runFastPhoneDetection, 100);

    return () => {
      isDisposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [examData, result, showPreFlight, mediaStream]);

  // ---------------------------------------------------------------------------
  // Periodic Visual & Multi-Parameter Proctoring Telemetry (Face & Identity)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!examData || result || showPreFlight || submitting || isSubmittingExamRef.current || !mediaStream) return;

    let timer: any = null;
    let isDisposed = false;

    const runTelemetryCycle = async () => {
      if (isDisposed) return;
      if (isDetectingRef.current || isAutoSubmittingRef.current || submitting || isSubmittingExamRef.current || result) {
        if (!isDisposed) timer = setTimeout(runTelemetryCycle, 1500);
        return;
      }
      const video = livePipVideoRef.current;
      const canvas = offscreenCanvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
        if (!isDisposed) timer = setTimeout(runTelemetryCycle, 800);
        return;
      }

      isDetectingRef.current = true;
      try {
        // Yield execution to browser event loop before heavy inference so clicks & ink packets never stall
        await new Promise((r) => setTimeout(r, 0));
        let isPersonFound = false;
        let isMobileDetected = false;
        let mobileConfidence = 0;
        let detectionDetails = '';

        detectionCycleRef.current += 1;
        const cycle = detectionCycleRef.current;

        // -------------------------------------------------------------
        // A. Primary Object & Phone Detection via COCO-SSD (Backup scan)
        // -------------------------------------------------------------
        if (visionModelRef.current) {
          try {
            canvas.width = 320;
            canvas.height = 240;
            const cCtx = canvas.getContext('2d');
            if (cCtx) {
              cCtx.drawImage(video, 0, 0, 320, 240);
              const predictions = await visionModelRef.current.detect(canvas, 10, 0.18);

              const phone = predictions.find((p: any) => {
                const c = (p.class || '').toLowerCase();
                if (c !== 'cell phone' && c !== 'mobile phone' && c !== 'telephone' && c !== 'remote' && !c.includes('phone') && !c.includes('mobile')) return false;
                return p.score >= 0.18;
              });

              if (phone) {
                isMobileDetected = true;
                mobileConfidence = Math.round(phone.score * 100);
                detectionDetails = `AI Vision: Handheld mobile device detected in examination workstation (${mobileConfidence}% confidence).`;
              }
            }
          } catch (modelErr) {
            console.warn('Vision detection cycle error:', modelErr);
          }
        }

        // -------------------------------------------------------------
        // B. High-Precision Biometric Face Verification & Imposter Detection via Face-API
        // -------------------------------------------------------------
        const faceapi = (window as any).faceapi;
        let faceApiCycleExecuted = false;

        if (faceapi && faceApiModelLoadedRef.current) {
          try {
            faceApiCycleExecuted = true;
            // Lightweight face detection every cycle (ultra-fast: ~6ms)
            const tinyOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.28 });
            const allFaces = await faceapi.detectAllFaces(video, tinyOpts);

            if (allFaces.length === 0) {
              // 0 faces detected in camera frame -> Candidate is absent
              isPersonFound = false;
              consecutiveUnauthorizedRef.current = 0;
              consecutiveMismatchRef.current = 0;
              if (unauthorizedPersonRef.current !== null) {
                updateUnauthorizedPerson(null);
              }
            } else if (allFaces.length > 1) {
              // Multiple faces detected!
              isPersonFound = false;
              consecutiveUnauthorizedRef.current += 1;
              updateUnauthorizedPerson('MULTIPLE_FACES');
              reportViolation(
                'MULTIPLE_FACES',
                'HIGH',
                `Multiple individuals (${allFaces.length}) detected within primary examination workspace.`
              );
            } else if (allFaces.length === 1) {
              // Exactly 1 face in view -> Verify identity & biometrics
              isPersonFound = true;

              const singleFace = await faceapi
                .detectSingleFace(video, tinyOpts)
                .withFaceLandmarks(true)
                .withFaceDescriptor();

              if (singleFace) {
                const landmarks = singleFace.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                // 1. Passive Liveness (Eye Aspect Ratio - EAR)
                if (leftEye.length >= 6 && rightEye.length >= 6) {
                  const earL =
                    (Math.hypot(leftEye[1].x - leftEye[5].x, leftEye[1].y - leftEye[5].y) +
                      Math.hypot(leftEye[2].x - leftEye[4].x, leftEye[2].y - leftEye[4].y)) /
                    (2.0 * Math.hypot(leftEye[0].x - leftEye[3].x, leftEye[0].y - leftEye[3].y));
                  const earR =
                    (Math.hypot(rightEye[1].x - rightEye[5].x, rightEye[1].y - rightEye[5].y) +
                      Math.hypot(rightEye[2].x - rightEye[4].x, rightEye[2].y - rightEye[4].y)) /
                    (2.0 * Math.hypot(rightEye[0].x - rightEye[3].x, rightEye[0].y - rightEye[3].y));
                  const ear = (earL + earR) / 2.0;

                  if (ear < 0.20) {
                    isEyeClosedRef.current = true;
                  } else if (isEyeClosedRef.current && ear >= 0.24) {
                    isEyeClosedRef.current = false;
                    lastBlinkTimeRef.current = Date.now();
                    eyeBlinkCounterRef.current += 1;
                  }

                  const timeSinceBlink = Date.now() - lastBlinkTimeRef.current;
                  if (timeSinceBlink > 40000 && !isDescriptiveTest) {
                    reportViolation(
                      'IDENTITY_MISMATCH',
                      'MEDIUM',
                      'Liveness anomaly: Natural eye blinking absent for > 40 seconds (static portrait/photo suspected).'
                    );
                    lastBlinkTimeRef.current = Date.now() - 25000;
                  }
                }

                // 2. Head Pose & Gaze Direction
                const nose = landmarks.getNose();
                if (nose.length >= 4 && leftEye.length > 0 && rightEye.length > 0) {
                  const noseTip = nose[3];
                  const dLeft = Math.hypot(noseTip.x - leftEye[0].x, noseTip.y - leftEye[0].y);
                  const dRight = Math.hypot(noseTip.x - rightEye[3].x, noseTip.y - rightEye[3].y);
                  const yawRatio = dLeft / Math.max(1, dRight);

                  if ((yawRatio < 0.38 || yawRatio > 2.6) && !isDescriptiveTest) {
                    const now = Date.now();
                    if (now - lastHeadPoseViolationTimeRef.current > 7000) {
                      lastHeadPoseViolationTimeRef.current = now;
                      reportViolation(
                        'WINDOW_BLUR',
                        'LOW',
                        'Gaze anomaly: Candidate head pose turned away from assessment monitor.'
                      );
                    }
                  }
                }

                // 3. 1:1:1 Deep Facial Biometric Triangulation (Live Face vs. Captured Entry Face vs. Stored DB Face)
                // Auto-recover baseline descriptor from snapshot ref if pending
                if (!baselineFaceDescriptorRef.current && baselineSnapshotRef.current) {
                  const snap = baselineSnapshotRef.current;
                  const img = new Image();
                  img.src = snap;
                  img.onload = async () => {
                    const d = await extractDescriptorFromSnapshot(img);
                    if (d) baselineFaceDescriptorRef.current = d;
                  };
                }

                // Auto-recover DB descriptors if not yet parsed
                if (dbFaceDescriptorsRef.current.length === 0 && examData?.dbBiometrics) {
                  loadDbBiometrics().catch(() => {});
                }

                if (singleFace.descriptor) {
                  const liveDescriptor = singleFace.descriptor;

                  // A. Match Live Face vs Captured Pre-Flight Entry Face
                  let distanceCaptured = 0;
                  let hasCapturedBaseline = false;
                  if (baselineFaceDescriptorRef.current) {
                    hasCapturedBaseline = true;
                    distanceCaptured = faceapi.euclideanDistance(
                      baselineFaceDescriptorRef.current,
                      liveDescriptor
                    );
                  }

                  // B. Match Live Face vs Stored Institutional DB Faces (Front, Left, Right)
                  let minDistanceDb = 1.0;
                  let hasDbBiometrics = false;
                  let matchedDbAngle = 'Front';
                  if (dbFaceDescriptorsRef.current.length > 0) {
                    hasDbBiometrics = true;
                    for (const item of dbFaceDescriptorsRef.current) {
                      const d = faceapi.euclideanDistance(item.descriptor, liveDescriptor);
                      if (d < minDistanceDb) {
                        minDistanceDb = d;
                        matchedDbAngle = item.angle;
                      }
                    }
                  }

                  // Verification Check: Euclidean Distance < 0.58 confirms identity
                  const matchesCaptured = !hasCapturedBaseline || distanceCaptured < 0.58;
                  const matchesDb = !hasDbBiometrics || minDistanceDb < 0.58;
                  const isVerifiedIndividual = matchesCaptured && matchesDb;

                  if (isVerifiedIndividual) {
                    // Registered enrolled candidate verified across both captured entry photo and DB profiles!
                    isPersonFound = true;
                    consecutiveMismatchRef.current = 0;
                    consecutiveUnauthorizedRef.current = 0;
                    // Self-healing: Immediately unblur screen if candidate returned!
                    if (unauthorizedPersonRef.current !== null) {
                      updateUnauthorizedPerson(null);
                    }
                  } else {
                    // Another person is sitting in candidate's seat!
                    isPersonFound = false;
                    consecutiveMismatchRef.current += 1;

                    // If distance is very high (> 0.68), trigger immediately. Otherwise confirm on 2nd cycle.
                    const isHighDeviation = distanceCaptured >= 0.68 || minDistanceDb >= 0.68;
                    const isConfirmedMismatch = isHighDeviation || consecutiveMismatchRef.current >= 2;

                    if (isConfirmedMismatch) {
                      updateUnauthorizedPerson('IDENTITY_MISMATCH');

                      let imposterSnap = '';
                      try {
                        canvas.width = 320;
                        canvas.height = 240;
                        const sCtx = canvas.getContext('2d');
                        if (sCtx) {
                          sCtx.drawImage(video, 0, 0, 320, 240);
                          imposterSnap = canvas.toDataURL('image/jpeg', 0.65);
                        }
                      } catch {}

                      const failureDetails = !matchesCaptured && !matchesDb
                        ? `Live face diverges from test-entry photo (Distance: ${distanceCaptured.toFixed(2)}) and stored DB photo (Distance: ${minDistanceDb.toFixed(2)}).`
                        : !matchesCaptured
                        ? `Live face deviates from test-entry photo (Distance: ${distanceCaptured.toFixed(2)}, Threshold: 0.58).`
                        : `Live face deviates from stored university DB profile (${matchedDbAngle} angle Distance: ${minDistanceDb.toFixed(2)}, Threshold: 0.58).`;

                      reportViolation(
                        'IDENTITY_MISMATCH',
                        'SEVERE',
                        `Biometric triangulation failure: ${failureDetails}`,
                        imposterSnap
                      );
                    }
                  }
                } else if (baselineFaceProfileRef.current) {
                  // Fallback: If 128-d descriptor is missing, use structural gradient cosine similarity
                  canvas.width = 160;
                  canvas.height = 120;
                  const cCtx = canvas.getContext('2d');
                  if (cCtx) {
                    cCtx.drawImage(video, 0, 0, 160, 120);
                    const currentProfile = extractFaceProfileFromCanvas(canvas, 20, 15, 120, 90);
                    if (currentProfile) {
                      const sim = compareFaceProfiles(baselineFaceProfileRef.current, currentProfile);
                      if (sim >= 0.48) {
                        isPersonFound = true;
                        consecutiveMismatchRef.current = 0;
                        if (unauthorizedPersonRef.current !== null) {
                          updateUnauthorizedPerson(null);
                        }
                      } else {
                        isPersonFound = false;
                        consecutiveMismatchRef.current += 1;
                        if (consecutiveMismatchRef.current >= 2) {
                          updateUnauthorizedPerson('IDENTITY_MISMATCH');
                          reportViolation(
                            'IDENTITY_MISMATCH',
                            'SEVERE',
                            `Visual profile mismatch: Candidate face deviates from enrolled baseline (Similarity: ${Math.round(sim * 100)}%).`
                          );
                        }
                      }
                    }
                  }
                } else {
                  isPersonFound = true;
                  if (unauthorizedPersonRef.current !== null) {
                    updateUnauthorizedPerson(null);
                  }
                }
              }
            }
          } catch (fErr) {
            console.warn('Face-api detection cycle error:', fErr);
            faceApiCycleExecuted = false;
          }
        }

        // Fallback: If Face-API is still loading, use resilient computer vision heuristic
        if (!faceApiCycleExecuted) {
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

              if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && (r - b) > 15) {
                skinCount++;
              }
            }

            const avgBrightness = totalBrightness / totalPixels;
            const skinRatio = skinCount / totalPixels;

            if (avgBrightness < 12) {
              isPersonFound = false;
            } else if (baselineFaceProfileRef.current) {
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
            if (avgAudioVolume > 78 && !isDescriptiveTest) {
              consecutiveAudioAlertRef.current += 1;
              if (consecutiveAudioAlertRef.current >= 3) {
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
          // Trigger absence alert within 1 cycle (2s) for standard exams, 2 cycles (4s) for descriptive
          const absenceThreshold = isDescriptiveTest ? 2 : 1;

          if (consecutiveFaceAbsentRef.current >= absenceThreshold) {
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
        if (!isDisposed) {
          timer = setTimeout(runTelemetryCycle, 2000);
        }
      }
    };

    // Stagger initial check 1.2s after starting exam for fast anomaly detection
    timer = setTimeout(runTelemetryCycle, 1200);

    return () => {
      isDisposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [examData, result, showPreFlight, mediaStream, isDescriptiveTest]);

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
    // Immediate violations (tab switch, face absence, companion unpin limit) submit with 0ms delay
    const jitter =
      reason === 'TAB_SWITCH' ||
      reason === 'FACE_ABSENCE_EXCEEDED' ||
      reason === 'COMPANION_UNPIN_LIMIT_EXCEEDED'
        ? 0
        : Math.floor(Math.random() * 2200);

    setTimeout(() => {
      submitExam();
    }, jitter);
  };

  // Companion unpin tracking: Allow unpinning up to 2 times, on 3rd unpin (> 2) notify faculty and auto-submit
  const companionUnpinCountRef = useRef<number>(0);
  const lastCompanionUnpinTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !examData || showPreFlight || result) return;
    const sId = examData.submissionId || examData.assessment?.id;
    if (!sId) return;

    const wsUrl = getCompanionWsUrl(sId, pairingHostRef.current);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'COMPANION_UNPINNED' || msg.type === 'COMPANION_SECURITY_VIOLATION') {
            const now = Date.now();
            if (now - lastCompanionUnpinTimeRef.current < 4000) return;
            lastCompanionUnpinTimeRef.current = now;

            companionUnpinCountRef.current += 1;
            const currentUnpin = companionUnpinCountRef.current;

            if (currentUnpin === 1) {
              reportViolation(
                'COMPANION_UNPINNED',
                'MEDIUM',
                'Companion app unpinned or backgrounded (Strike 1 of 2 allowed). On the 3rd exit, the exam will automatically terminate.'
              );
              alert(
                '⚠️ COMPANION APP WARNING (Warning 1/2):\nYou left or unpinned the digital answer companion app. You are allowed 2 exits. On the 3rd exit, your exam will be automatically terminated and submitted.'
              );
            } else if (currentUnpin === 2) {
              reportViolation(
                'COMPANION_UNPINNED',
                'HIGH',
                'Companion app unpinned or backgrounded (Warning 2 of 2 - FINAL WARNING). Any subsequent exit will terminate and auto-submit the exam.'
              );
              alert(
                '🚨 FINAL WARNING (Warning 2/2):\nYou left or unpinned the digital answer companion app. You have 0 warnings remaining. If you leave or unpin the companion app again, your examination will be terminated and submitted immediately.'
              );
            } else {
              reportViolation(
                'COMPANION_UNPINNED',
                'SEVERE',
                'Exam terminated: Companion app unpinned more than twice (3rd exit).'
              );
              alert(
                '❌ EXAM TERMINATED:\nYou exceeded the maximum companion app unpin limit (2 exits allowed). Your exam has been automatically submitted.'
              );
              handleAutoSubmit('COMPANION_UNPIN_LIMIT_EXCEEDED');
            }
          }
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}

    return () => {
      try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      } catch {}
    };
  }, [examData, showPreFlight, result]);

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

  const handleManualSubmitClick = () => {
    if (submitting || isSubmittingExamRef.current || !examData) return;
    setShowConfirmSubmitModal(true);
  };

  const submitExam = async () => {
    if (!examData || submitting || isSubmittingExamRef.current) return;
    isSubmittingExamRef.current = true;
    setSubmitting(true);
    setShowConfirmSubmitModal(false);

    // Fast memory assembly of answers without slow HTTP fetches (backend automatically merges strokes)
    const answerPayload = examData.questions.map((q: any) => {
      const candidateTyped = answers[q.id];
      let answerText: string | undefined = undefined;
      if (
        typeof candidateTyped === 'string' &&
        candidateTyped.trim().length > 0 &&
        !candidateTyped.startsWith('opt-')
      ) {
        answerText = candidateTyped.trim();
      }

      return {
        questionId: q.id,
        selectedOptionId: answers[q.id] || null,
        answerText,
        sourceCode: codingAnswers[q.id]?.sourceCode || undefined,
        code: codingAnswers[q.id]?.sourceCode || undefined,
        language: codingAnswers[q.id]?.language || 'PYTHON',
        timeSpentSeconds: 30,
      };
    });

    try {
      // 1. Submit attempt to backend (backend atomically evaluates and generates exitPass)
      const submitRes = await api.post(`/assessments/submissions/${examData.submissionId}/submit`, {
        answers: answerPayload,
      });

      // 2. Concurrently fetch full itemized result and ensure companion notification in parallel
      const [detailedResult, companionSubmitData] = await Promise.all([
        api.get(`/assessments/submissions/${examData.submissionId}/result`).catch(() => null),
        isDescriptiveTest
          ? fetch(
              `/api/v1/companion/submit?sessionId=${encodeURIComponent(companionSession)}&submissionId=${examData.submissionId}`,
              { method: 'POST' },
            )
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      if (detailedResult) {
        setResult(detailedResult);
      } else {
        setResult({
          submissionId: examData.submissionId,
          assessmentTitle: examData.assessment?.title || 'Assessment',
          assessmentCode: examData.assessment?.code || '',
          courseCode: examData.assessment?.code?.split('-')?.[0] || 'COURSE',
          attemptNumber: examData.attemptNumber || 1,
          status: submitRes?.status || (isDescriptiveTest ? 'SUBMITTED' : 'EVALUATED'),
          isPendingFacultyGrading: isDescriptiveTest || submitRes?.status === 'SUBMITTED',
          totalScore: submitRes?.totalScore ?? 0,
          totalMarks: examData.assessment?.totalMarks ?? 100,
          percentage: submitRes?.percentage ?? 0,
          passed: Boolean(submitRes?.passed),
          startedAt: examData.startedAt || new Date().toISOString(),
          submittedAt: submitRes?.submittedAt || new Date().toISOString(),
          answers: [],
        });
      }

      // 3. For descriptive tests with mobile companion, immediately reveal exit pass dialog
      if (isDescriptiveTest) {
        const pass = submitRes?.exitPass || companionSubmitData?.exitPass || '123456';
        setExitPassCode(pass);
        setShowExitPassModal(true);
      }

      // 4. Safely stop webcam stream tracks ONLY after submission is finished and result is displayed
      if (mediaStream) {
        try {
          mediaStream.getTracks().forEach((track) => track.stop());
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Failed to submit exam:', err);
      isSubmittingExamRef.current = false;
      const errMsg = err?.message || 'Failed to submit exam. Please try again.';
      alert(`Submission notice: ${errMsg}\n\nPlease click Submit Exam again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex flex-col items-center justify-center space-y-4 relative z-10 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
        <p className="font-mono text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">INITIALIZING SECURE ASSESSMENT ENVIRONMENT...</p>
      </div>
    );
  }

  if (testEndedError) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-[#1a2540] dark:text-[#e8edf5] font-sans relative z-10">
        <div className="max-w-md w-full panel p-8 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono uppercase tracking-wider">ASSESSMENT HAS ENDED</h2>
            <p className="font-mono text-xs text-rose-500 uppercase tracking-wider mt-1">Examination Window Closed</p>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed panel p-3.5 border border-[var(--grid-line)] font-mono">
            {testEndedError}
          </p>
          <button
            type="button"
            onClick={() => router.push('/student/assessments')}
            className="w-full py-3 bg-[var(--primary)] text-white font-mono text-xs uppercase tracking-wider hover:opacity-90 transition border border-[var(--primary)]"
          >
            RETURN TO ASSESSMENT HUB →
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Pre-Flight Device & Face Enrollment Modal
  // ---------------------------------------------------------------------------
  if (showPreFlight) {
    const totalSteps = isDescriptiveTest ? 4 : 3;
    const completedSteps =
      (cameraPermission === 'granted' && micPermission === 'granted' ? 1 : 0) +
      (isDescriptiveTest ? (preflightMobileConnected ? 1 : 0) : 0) +
      (faceEnrolled ? 1 : 0) +
      (integrityPledge ? 1 : 0);
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);

    const canEnterExam =
      integrityPledge &&
      cameraPermission === 'granted' &&
      faceEnrolled &&
      faceEnrollmentFeedback === 'SUCCESS_VERIFIED' &&
      Boolean(baselineFaceDescriptorRef.current) &&
      (!isDescriptiveTest || preflightMobileConnected);

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-800 dark:selection:text-cyan-200">
        {/* Ambient atmospheric glows */}
        <div className="fixed -top-40 -left-40 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl w-full my-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {/* Top glowing laser line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="relative p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/20 dark:border-cyan-500/30 dark:text-cyan-400 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20">
                    AI PROCTORING PROTOCOL
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                    SECURE SESSION
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                  Biometric Proctoring Gateway
                </h1>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {examData?.assessment?.title || 'Examination'} •{' '}
                  <span className="text-cyan-700 dark:text-cyan-400 font-bold">{examData?.assessment?.code || 'EXAM-SEC'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-amber-400 font-mono text-xs font-bold shadow-xs">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{examData?.assessment?.durationMinutes || 60} MINS</span>
              </div>
            </div>
          </div>

          {/* Interactive Readiness Meter */}
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-slate-700 dark:text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Readiness Verification
              </span>
              <span className="font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                {completedSteps} / {totalSteps} Protocols Verified ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Camera Preview and Diagnostics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Viewfinder: 7 cols on lg */}
            <div
              data-keep-dark
              className="lg:col-span-7 relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-md flex items-center justify-center group"
            >
              {cameraPermission === 'granted' ? (
                <>
                  <video
                    ref={attachPreflightVideo}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      e.currentTarget.play().catch(() => {});
                    }}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {/* HUD Corner Brackets */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                  {/* Biometric center reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-28 h-36 border-2 border-dashed border-cyan-400/50 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
                    </div>
                  </div>

                  {/* Live Stream Status Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LIVE AI SENSOR</span>
                  </div>

                  {/* Sensor Resolution Tag */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5 border border-cyan-500/30 shadow-xs">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>30 FPS • HD</span>
                  </div>

                  {/* Viewfinder Guidance Pill */}
                  <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-[10px] font-mono text-slate-200">
                      Align face within reticle
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-rose-300 font-bold">Webcam Stream Offline</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Camera access is mandatory for continuous identity & multi-face verification.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestDevicePermissions}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                  >
                    Grant Camera Permission
                  </button>
                </div>
              )}
            </div>

            {/* Diagnostics Telemetry: 5 cols on lg */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Sensor Diagnostics
                </h3>
                <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/20 font-bold">
                  SYS ACTIVE
                </span>
              </div>

              <div className="space-y-2">
                {/* Camera Feed */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-medium text-xs">
                    <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Camera Stream</span>
                  </span>
                  {cameraPermission === 'granted' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> READY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> REQUIRED
                    </span>
                  )}
                </div>

                {/* Microphone */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-medium text-xs">
                    <Mic className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Audio Input</span>
                  </span>
                  {micPermission === 'granted' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> READY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> REQUIRED
                    </span>
                  )}
                </div>

                {/* Fullscreen Lockdown */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-medium text-xs">
                    <Maximize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Secure Kiosk</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 text-[11px] font-mono font-bold">
                    {isCodeBasedExam ? '0 EXITS ALLOWED' : isDescriptiveExam ? '1 EXIT ALLOWED' : '3 EXITS ALLOWED'}
                  </span>
                </div>

                {/* Phone Companion (if descriptive) */}
                {isDescriptiveTest && (
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      preflightMobileConnected
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-medium text-xs">
                      <Smartphone
                        className={`w-4 h-4 ${
                          preflightMobileConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 animate-pulse'
                        }`}
                      />
                      <span>Mobile Link</span>
                    </span>
                    {preflightMobileConnected ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> PAIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> PENDING
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Companion Pairing Card for Descriptive Tests */}
          {isDescriptiveTest && (
            <div
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                preflightMobileConnected
                  ? 'bg-emerald-50/80 border-2 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-500/40'
                  : 'bg-amber-50/70 border-2 border-amber-300 dark:bg-amber-950/20 dark:border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-3 rounded-xl shrink-0 ${
                      preflightMobileConnected
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                    }`}
                  >
                    <Smartphone className={`w-5 h-5 ${preflightMobileConnected ? '' : 'animate-bounce'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {preflightMobileConnected
                          ? 'Digital Ink Companion Connected'
                          : 'Mobile Companion Connection Required'}
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          preflightMobileConnected
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {preflightMobileConnected ? 'SYNC ACTIVE' : 'AWAITING PAIRING'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      {preflightMobileConnected
                        ? 'Handwritten answers written on your phone stylus will stream live to this test in real time.'
                        : 'Open the CLIAS Companion on your phone and enter the pairing host and session token below.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => checkMobileStatus(true)}
                  disabled={preflightCheckingMobile}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md ${
                    preflightMobileConnected
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/25 dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600'
                  }`}
                >
                  {preflightCheckingMobile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>{preflightMobileConnected ? 'Re-verify Link' : 'Check Phone Connection'}</span>
                </button>
              </div>

              {!preflightMobileConnected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/95 dark:bg-slate-950/80 p-4 rounded-xl border border-amber-200 dark:border-slate-800">
                  {/* Host */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-700 dark:text-slate-400 uppercase font-mono font-bold tracking-wider flex items-center gap-1.5">
                      <Wifi className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      1. Companion Host
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-amber-50/80 dark:bg-slate-900/90 px-3 py-2 rounded-lg border border-amber-200 dark:border-slate-700/80">
                      <span className="font-mono text-xs font-bold text-amber-950 dark:text-amber-300 select-all break-all">
                        {pairingHost || 'clias.onrender.com'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(pairingHost || 'clias.onrender.com', 'host')}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                        title="Copy Companion Host"
                      >
                        {copiedField === 'host' ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            <Check className="w-3.5 h-3.5" /> COPIED
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 6-Digit PIN */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-700 dark:text-slate-400 uppercase font-mono font-bold tracking-wider flex items-center gap-1.5">
                      <Fingerprint className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      2. Dynamic 6-Digit PIN
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-emerald-50/80 dark:bg-slate-900/90 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
                      <span className="font-mono text-xs font-black text-emerald-950 dark:text-emerald-400 tracking-wider select-all break-all">
                        {companionPinDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(companionPinDisplay, 'token')}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-md hover:bg-emerald-200/50 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                        title="Copy Dynamic PIN"
                      >
                        {copiedField === 'token' ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            <Check className="w-3.5 h-3.5" /> COPIED
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Biometric Identity Enrollment Card */}
          <div
            className={`p-5 rounded-2xl border transition-all space-y-4 ${
              faceEnrolled
                ? 'bg-emerald-50/80 border-2 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-500/40'
                : 'bg-slate-50 border-2 border-slate-200 dark:bg-slate-950/70 dark:border-slate-800/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    faceEnrolled
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                      : 'bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                  }`}
                >
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Biometric Facial Reference Enrollment
                    </h4>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        faceEnrolled
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                          : 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30'
                      }`}
                    >
                      {faceEnrolled ? 'ENROLLED' : 'ACTION REQUIRED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    Capture a reference snapshot. The AI continuously verifies candidate continuity. If an unrecognized individual or multi-face is detected, the exam screen blurs immediately.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCaptureFace}
                disabled={cameraPermission !== 'granted' || enrollingFace}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold shrink-0 transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  faceEnrolled
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700'
                    : 'bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-cyan-600/20 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-teal-500 dark:text-slate-950 dark:font-black'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {enrollingFace ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : faceEnrolled ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{faceEnrolled ? 'Retake Snapshot' : 'Capture Snapshot'}</span>
              </button>
            </div>

            {faceEnrollmentFeedback === 'NO_FACE_DETECTED' && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>No face detected in webcam view. Please face the camera directly with adequate lighting and click "Capture Snapshot" again.</span>
              </div>
            )}

            {faceEnrollmentFeedback === 'MULTIPLE_FACES' && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Multiple faces detected in camera view. Ensure only you (the registered candidate) are present in frame.</span>
              </div>
            )}

            {faceEnrollmentFeedback === 'DB_MISMATCH' && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in duration-200 space-y-2">
                <div className="flex items-center gap-2 font-bold font-mono text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>BIOMETRIC IDENTITY MISMATCH: DATABASE VERIFICATION FAILED</span>
                </div>
                <p className="leading-relaxed">
                  The face captured by your webcam does not match the official student biometric photos locked in the university database (Euclidean Distance: <strong className="font-mono">{dbBiometricsMatchInfo?.distance.toFixed(2)}</strong>, threshold: 0.58).
                </p>
                <div className="p-2.5 rounded-lg bg-rose-100/60 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/60 text-[11px] leading-snug">
                  ⚠️ <strong>Security Violation:</strong> Impersonation or candidate substitution is strictly forbidden. Examination launch is blocked until the registered student is positioned before the camera.
                </div>
              </div>
            )}

            {baselineSnapshot && faceEnrolled && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-500/30 animate-in fade-in duration-300 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex -space-x-3 shrink-0">
                    {examData?.dbBiometrics?.faceFrontSnapshot && (
                      <img
                        src={examData.dbBiometrics.faceFrontSnapshot}
                        alt="Enrolled DB Profile"
                        className="w-14 h-14 object-cover rounded-xl border-2 border-slate-300 dark:border-slate-700 shadow-sm"
                        title="Stored University DB Photo"
                      />
                    )}
                    <img
                      src={baselineSnapshot}
                      alt="Captured Test-Entry Photo"
                      className="w-14 h-14 object-cover rounded-xl border-2 border-emerald-500 shadow-md"
                      title="Captured Exam-Entry Snapshot"
                    />
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white dark:text-slate-950">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-xs font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      BIOMETRIC IDENTITY AUTHENTICATED
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Verified against university database
                      {dbBiometricsMatchInfo ? ` (${dbBiometricsMatchInfo.confidence}% Match Confidence, Distance: ${dbBiometricsMatchInfo.distance.toFixed(2)})` : ''}.
                      Continuous 5-second 3-way triangulation active.
                    </p>
                  </div>
                </div>
                {dbBiometricsMatchInfo && (
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/40 text-center font-mono shrink-0">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">{dbBiometricsMatchInfo.confidence}% Match</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400">Dist: {dbBiometricsMatchInfo.distance.toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Academic Integrity Pledge */}
          <label
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer text-xs select-none ${
              integrityPledge
                ? 'bg-cyan-50 border-cyan-400 text-slate-900 dark:bg-cyan-500/10 dark:border-cyan-500/40 dark:text-slate-200 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/80'
            }`}
          >
            <input
              type="checkbox"
              checked={integrityPledge}
              onChange={(e) => setIntegrityPledge(e.target.checked)}
              className="mt-0.5 rounded border-slate-400 dark:border-slate-600 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500 w-4 h-4 accent-cyan-600 dark:accent-cyan-500 shrink-0 cursor-pointer"
            />
            <span className="leading-relaxed">
              I solemnly pledge to uphold academic integrity. I understand that tab switches, unauthorized keyboard combinations, exiting fullscreen (strictly limited to {isCodeBasedExam ? '0 exits for coding assessments' : isDescriptiveExam ? '1 exit for descriptive assessments' : '3 exits for MCQ assessments'}), and multi-face anomalies are recorded directly to the{' '}
              <strong className="font-bold text-slate-950 dark:text-white underline decoration-cyan-500 decoration-1">
                Faculty Proctoring Audit Console
              </strong>.
            </span>
          </label>

          {/* Primary Launch Action CTA */}
          <button
            type="button"
            onClick={handleConfirmAndEnterExam}
            disabled={!canEnterExam}
            className={`w-full py-4 rounded-2xl font-mono font-black uppercase tracking-wider text-xs transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg ${
              !canEnterExam
                ? 'bg-slate-200 text-slate-500 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700/60 cursor-not-allowed opacity-75'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white dark:from-emerald-500 dark:via-teal-500 dark:to-cyan-500 dark:text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.35)] hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {cameraPermission !== 'granted' ? (
              <>
                <CameraOff className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Grant Camera Permission to Continue</span>
              </>
            ) : isDescriptiveTest && !preflightMobileConnected ? (
              <>
                <Smartphone className="w-4 h-4 animate-pulse text-amber-600 dark:text-amber-400" />
                <span>Connect Phone Companion to Unlock Assessment</span>
              </>
            ) : !faceEnrolled ? (
              <>
                <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {faceEnrollmentFeedback === 'DB_MISMATCH'
                    ? 'Biometric Mismatch with Database (Entry Blocked)'
                    : faceEnrollmentFeedback === 'MULTIPLE_FACES'
                    ? 'Multiple Faces Detected (Entry Blocked)'
                    : faceEnrollmentFeedback === 'NO_FACE_DETECTED'
                    ? 'No Face Detected in Camera (Retake Snapshot)'
                    : 'Capture & Verify Face Biometrics to Unlock'}
                </span>
              </>
            ) : !integrityPledge ? (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Sign Academic Integrity Pledge to Proceed</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm & Enter Fullscreen Assessment →</span>
              </>
            )}
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
      <div className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] p-6 sm:p-12 relative z-10 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="panel p-8 shadow-2xl text-center">
            <div
              className={`w-16 h-16 mx-auto flex items-center justify-center mb-4 ${
                result.isPendingFacultyGrading || result.status === 'SUBMITTED'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : result.passed
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
              }`}
            >
              {result.isPendingFacultyGrading || result.status === 'SUBMITTED' ? (
                <PenTool className="w-8 h-8" />
              ) : (
                <Award className="w-8 h-8" />
              )}
            </div>

            <span className="font-mono text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">
              {result.courseCode} • {result.assessmentCode}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono uppercase tracking-wider mt-1">{result.assessmentTitle}</h1>

            {result.isPendingFacultyGrading || result.status === 'SUBMITTED' ? (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/15 to-transparent border-2 border-amber-500/40 max-w-2xl mx-auto text-center space-y-3 shadow-lg">
                <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded-full font-mono text-xs font-bold uppercase tracking-wider">
                  Digital Ink Answers Submitted • Awaiting Evaluation
                </span>
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200">
                  Descriptive Examination Under Manual Faculty Evaluation
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Your handwritten digital ink strokes and answer sheets have been securely submitted to the faculty review portal. Descriptive question answers are manually graded by your course instructor according to official rubrics. Your final grade and evaluator remarks will appear once reviewed.
                </p>
                <div className="flex items-center justify-center gap-6 pt-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                  <span>Proctoring Trust: <strong className="text-emerald-500 font-bold">{trustScore}%</strong></span>
                  <span>Total Exam Marks: <strong className="text-slate-900 dark:text-white font-bold">{result.totalMarks} M</strong></span>
                  <span>Status: <strong className="text-amber-600 dark:text-amber-400 font-bold">AWAITING FACULTY REVIEW</strong></span>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
                <div className="panel px-6 py-4">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 block font-bold">YOUR SCORE</span>
                  <span className="text-2xl font-black font-mono">
                    {result.totalScore} / {result.totalMarks}
                  </span>
                </div>
                <div className="panel px-6 py-4">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 block font-bold">PERCENTAGE</span>
                  <span className="text-2xl font-black font-mono text-[var(--primary)]">
                    {result.percentage}%
                  </span>
                </div>
                <div className="panel px-6 py-4">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 block font-bold">PROCTORING TRUST</span>
                  <span className={`text-2xl font-black font-mono ${trustScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {trustScore}%
                  </span>
                </div>
                <div className="panel px-6 py-4">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 block font-bold">OUTCOME</span>
                  <span
                    className={`text-2xl font-black font-mono ${
                      result.passed ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {result.passed ? 'PASSED' : 'RETAKE'}
                  </span>
                </div>
              </div>
            )}

            {exitPassCode && (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-2 border-amber-500/40 max-w-md mx-auto text-center space-y-2 shadow-lg animate-in fade-in zoom-in-95">
                <span className="font-mono text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-extrabold block flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Proctor Exit Pass for Mobile Companion
                </span>
                <div className="font-mono text-4xl sm:text-5xl font-black text-amber-600 dark:text-amber-300 tracking-[0.25em] py-1 select-all">
                  {exitPassCode}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enter this 6-digit verification code on your mobile phone to safely exit Kiosk Lockdown mode.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setResultTab('leaderboard')}
                className={`px-5 py-2.5 font-mono text-xs uppercase tracking-wider border transition ${
                  resultTab === 'leaderboard'
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--grid-line)] text-slate-600 dark:text-slate-400 hover:text-inherit'
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
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📝 Question Explanations ({result.answers?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/student/assessments')}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition"
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Question Itemization & Explanations</h3>
              {result.answers?.map((ans: any, idx: number) => {
                const isDescriptive = !ans.correctOptionText && !ans.options?.length;
                const isPending = (result.isPendingFacultyGrading || result.status === 'SUBMITTED') && isDescriptive && (ans.pointsAwarded === null || ans.pointsAwarded === undefined || (ans.pointsAwarded === 0 && !ans.feedback));

                return (
                  <div
                    key={ans.questionId}
                    className={`rounded-2xl border p-6 ${
                      isPending
                        ? 'bg-white dark:bg-slate-900 border-amber-500/40 shadow-xs'
                        : ans.isCorrect || ans.pointsAwarded > 0
                        ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-rose-500/30 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Question {idx + 1} {ans.topicName ? `• ${ans.topicName}` : ''}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          isPending
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : ans.isCorrect || ans.pointsAwarded > 0
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                        }`}
                      >
                        {isPending
                          ? 'Under Faculty Evaluation'
                          : ans.pointsAwarded !== undefined
                          ? `+${ans.pointsAwarded} pts Awarded`
                          : ans.isCorrect
                          ? 'Correct'
                          : '0 pts (Incorrect)'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed mb-4">
                      {ans.questionText}
                    </p>

                    {isDescriptive ? (
                      <div className="space-y-3 mb-4">
                        <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 block font-semibold mb-1">Response Mode:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Digital Ink Handwritten Canvas Answer Sheet (Synchronized via S-Pen Mobile Companion)
                          </span>
                        </div>
                        {ans.feedback && (
                          <div className="p-3.5 rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-xs">
                            <span className="text-emerald-800 dark:text-emerald-300 block font-bold mb-1">Faculty Evaluator Remarks:</span>
                            <p className="text-slate-700 dark:text-slate-300 font-sans">{ans.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                        <div className={`p-3.5 rounded-xl border ${
                          ans.isCorrect
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                        }`}>
                          <span className="text-slate-600 dark:text-slate-400 block font-semibold mb-1">Your Selection:</span>
                          <span className={`block font-bold text-sm ${ans.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                            {ans.selectedOptionText || 'No answer selected'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-slate-600 dark:text-slate-400 block font-semibold mb-1">Correct Solution:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm block">{ans.correctOptionText}</span>
                        </div>
                      </div>
                    )}

                    {ans.explanation && (
                      <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-indigo-200 leading-relaxed font-sans">
                        <strong className="text-indigo-950 dark:text-white block mb-1 font-bold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Evaluation Rubric / Pedagogical Note:
                        </strong>
                        {ans.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
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
      className="min-h-screen bg-transparent text-[#1a2540] dark:text-[#e8edf5] flex flex-col transition-colors duration-200 select-none relative z-10"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Anti-Screenshot Print Media CSS Blocker */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, #__next, div, main, header {
            display: none !important;
            visibility: hidden !important;
          }
        }
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        input, textarea {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          user-select: text !important;
        }
      `}} />

      {/* Offscreen hidden canvas for luminance telemetry */}
      <canvas ref={offscreenCanvasRef} className="hidden" />

      {/* 1. Window Blur Anti-Screenshot Privacy Shield */}
      {isWindowBlurred && !tabSwitchAlertModal?.show && !tabSwitchTerminated && (
        <div
          onClick={() => {
            window.focus();
            if (document.hasFocus()) {
              setIsWindowBlurred(false);
            }
          }}
          className="fixed inset-0 z-40 bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-6 text-center select-none animate-in fade-in duration-100 cursor-pointer"
        >
          <div className="space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Exam Screen Protected</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exam content is hidden while window focus is lost. Click anywhere to return focus and resume your exam.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.focus();
                setIsWindowBlurred(false);
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1.5 shadow-lg"
            >
              Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* 2. Tab Switching & Alt+Tab Warning/Termination Overlay */}
      {tabSwitchAlertModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div
            className={`max-w-lg w-full bg-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl border-2 ${
              tabSwitchAlertModal.isTerminated
                ? 'border-rose-600 shadow-rose-950/80'
                : tabSwitchAlertModal.strike === 3
                ? 'border-rose-500 shadow-rose-950/80 ring-4 ring-rose-500/30 animate-pulse'
                : 'border-amber-500/70 shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${
                tabSwitchAlertModal.isTerminated || tabSwitchAlertModal.strike === 3
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {tabSwitchAlertModal.isTerminated ? (
                <XCircle className="w-10 h-10" />
              ) : tabSwitchAlertModal.strike === 3 ? (
                <ShieldAlert className="w-10 h-10" />
              ) : (
                <AlertTriangle className="w-10 h-10" />
              )}
            </div>

            <div className="space-y-3">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-full border uppercase tracking-wider inline-block ${
                  tabSwitchAlertModal.isTerminated
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : tabSwitchAlertModal.strike === 3
                    ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {tabSwitchAlertModal.isTerminated
                  ? 'EXAM AUTOMATICALLY TERMINATED'
                  : tabSwitchAlertModal.strike === 3
                  ? 'FINAL WARNING: Strike 3 of 3'
                  : `Warning: Strike ${tabSwitchAlertModal.strike} of 3`}
              </span>

              <h2 className="text-2xl font-black text-white">
                {tabSwitchAlertModal.isTerminated
                  ? 'Exam Terminated: Strike Limit Exceeded'
                  : tabSwitchAlertModal.strike === 3
                  ? 'Final Warning: Stay in Exam Window!'
                  : 'Tab / Application Switch Detected'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {tabSwitchAlertModal.reason}
              </p>
            </div>

            {tabSwitchAlertModal.isTerminated ? (
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
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDismissTabSwitchModal}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 ${
                    tabSwitchAlertModal.strike === 3
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 ring-2 ring-rose-400/50'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {tabSwitchAlertModal.strike === 3
                      ? 'I Acknowledge Final Warning — Return to Exam'
                      : `I Understand — Return to Exam (${tabSwitchAlertModal.strike}/3)`}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400">
                  {tabSwitchAlertModal.strike === 3
                    ? '⚠️ The very next Alt+Tab or window switch will automatically submit and conclude your exam.'
                    : `You have ${3 - tabSwitchAlertModal.strike} warning(s) remaining before automated termination.`}
                </p>
              </div>
            )}
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
                  : 'Biometric Imposter Detected • Identity Mismatch'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {unauthorizedPerson === 'MULTIPLE_FACES'
                  ? 'More than one individual was detected in your camera view. The exam screen is blurred to prevent unauthorized assistance. Please ensure only you are present.'
                  : 'Real-time 5-second biometric triangulation detected that the person currently in front of the camera does not match the registered university database photo or the captured exam-entry baseline. The assessment is locked and blurred until the verified candidate returns.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-rose-300 font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400 shrink-0" />
              <span>Scanning camera feed... Screen will unblur automatically when the verified enrolled candidate returns.</span>
            </div>

            <div className="pt-2 flex items-center justify-center gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              {examData?.dbBiometrics?.faceFrontSnapshot && (
                <div className="text-center">
                  <img
                    src={examData.dbBiometrics.faceFrontSnapshot}
                    alt="Registered Database Face"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-teal-500/60 shadow-md mx-auto"
                  />
                  <span className="text-[10px] text-teal-400 font-mono mt-1 block">Registered DB Face</span>
                </div>
              )}
              {baselineSnapshot && (
                <div className="text-center">
                  <img
                    src={baselineSnapshot}
                    alt="Exam-Entry Baseline"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/60 shadow-md mx-auto"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Entry Snapshot</span>
                </div>
              )}
              <div className="text-left text-xs max-w-xs">
                <span className="text-emerald-400 font-bold block flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enrolled Identity Locked
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Only this verified individual is authorized to take this assessment.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUnauthorizedPerson(null);
                unauthorizedPersonRef.current = null;
                consecutiveMismatchRef.current = 0;
                consecutiveUnauthorizedRef.current = 0;
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Am the Enrolled Candidate (Return to Exam)</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Exit Blocking & Policy Enforcement Overlay */}
      {(isFullscreenExited || fullscreenAlertModal?.show) && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div
            className={`max-w-lg w-full bg-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl border-2 ${
              fullscreenAlertModal?.isTerminated || fullscreenTerminated
                ? 'border-rose-600 shadow-rose-950/80 ring-4 ring-rose-600/30'
                : fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                ? 'border-rose-500 shadow-rose-950/80 ring-4 ring-rose-500/30 animate-pulse'
                : 'border-amber-500/70 shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${
                fullscreenAlertModal?.isTerminated || fullscreenTerminated || (fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed)
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {fullscreenAlertModal?.isTerminated || fullscreenTerminated ? (
                <XCircle className="w-10 h-10" />
              ) : fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed ? (
                <ShieldAlert className="w-10 h-10" />
              ) : (
                <AlertTriangle className="w-10 h-10" />
              )}
            </div>

            <div className="space-y-3">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-full border uppercase tracking-wider inline-block ${
                  fullscreenAlertModal?.isTerminated || fullscreenTerminated
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                    ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {fullscreenAlertModal?.isTerminated || fullscreenTerminated
                  ? 'EXAM AUTOMATICALLY TERMINATED'
                  : fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                  ? `FINAL WARNING: ${fullscreenAlertModal.strike} of ${fullscreenAlertModal.maxAllowed} Allowed`
                  : `Warning: Fullscreen Exit ${fullscreenAlertModal?.strike || 1} of ${fullscreenAlertModal?.maxAllowed || 3}`}
              </span>

              <h2 className="text-2xl font-black text-white">
                {fullscreenAlertModal?.isTerminated || fullscreenTerminated
                  ? 'Assessment Terminated: Fullscreen Violation'
                  : fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                  ? 'Final Warning: Stay in Fullscreen Mode!'
                  : 'Fullscreen Mode Exited'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {fullscreenAlertModal?.reason ||
                  'You exited mandatory fullscreen examination mode. An integrity anomaly has been logged to your evaluation record.'}
              </p>

              {/* Policy summary box */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-left flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">
                  Assessment Policy: <strong className="text-slate-200">{fullscreenAlertModal?.examTypeLabel || examTypeFullscreenLabel} Mode</strong>
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {fullscreenAlertModal ? `${fullscreenAlertModal.maxAllowed} Exit${fullscreenAlertModal.maxAllowed === 1 ? '' : 's'} Allowed` : `${maxFullscreenExits} Exits Allowed`}
                </span>
              </div>
            </div>

            {fullscreenAlertModal?.isTerminated || fullscreenTerminated ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span>Auto-submission Status:</span>
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting to Evaluation Server...
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your submitted responses and proctoring audit telemetry have been transmitted to the Faculty Audit Console. Fullscreen proctoring has concluded.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (fullscreenAlertModal?.isTerminated || fullscreenTerminated || isAutoSubmittingRef.current) return;
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                    } catch (e) {
                      console.warn('Could not re-enter fullscreen:', e);
                    }
                    setIsFullscreenExited(false);
                    setFullscreenAlertModal(null);
                  }}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 ring-2 ring-rose-400/50'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>
                    {fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                      ? 'I Acknowledge Final Warning — Re-Enter Fullscreen'
                      : `Re-Enter Fullscreen to Resume (${fullscreenAlertModal?.strike || 1}/${fullscreenAlertModal?.maxAllowed || 3})`}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400">
                  {fullscreenAlertModal && fullscreenAlertModal.strike === fullscreenAlertModal.maxAllowed
                    ? '⚠️ Any subsequent attempt to exit fullscreen will automatically terminate and submit your assessment.'
                    : `You have ${Math.max(0, (fullscreenAlertModal?.maxAllowed || 3) - (fullscreenAlertModal?.strike || 1))} warning(s) remaining before automated termination.`}
                </p>
              </div>
            )}
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

        <div className={pipMinimized ? 'hidden' : 'space-y-2'}>
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
            <video
              ref={attachLivePipVideo}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
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
        </div>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
              Formal Proctored Examination
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 border ${
                tabSwitchStrikeCount >= 3
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <Lock className="w-3 h-3" />
              {tabSwitchStrikeCount === 0
                ? 'Alt+Tab: 3 Warnings Allowed'
                : `Alt+Tab Strikes: ${tabSwitchStrikeCount}/3`}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              Screenshots & Copy/Paste Blocked
            </span>
          </div>
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
            onClick={handleManualSubmitClick}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{submitting ? 'Submitting Exam...' : 'Submit Exam'}</span>
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
                        onPaste={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            e.clipboardData?.clearData();
                          } catch {}
                          setWarningMessage('INTEGRITY ALERT: Pasting external code is strictly prohibited during the proctored exam.');
                          reportViolation('WINDOW_BLUR', 'MEDIUM', 'Unauthorized paste attempt inside code editor.');
                        }}
                        onCopy={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            e.clipboardData?.clearData();
                            navigator.clipboard?.writeText?.('');
                          } catch {}
                          setWarningMessage('INTEGRITY ALERT: Copying code from the exam is disabled.');
                          reportViolation('WINDOW_BLUR', 'LOW', 'Unauthorized copy attempt in code editor.');
                        }}
                        onCut={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setWarningMessage('INTEGRITY ALERT: Cut operation is disabled.');
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                        }}
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
              ) : (currentQ.type === 'SHORT_ANSWER' || currentQ.type === 'DESCRIPTIVE' || !currentQ.options || currentQ.options.length === 0) ? (
                /* DESCRIPTIVE DIGITAL INK COMPANION WORKSPACE */
                <DescriptiveCompanionWorkspace
                  question={currentQ}
                  questionNumber={currentIdx + 1}
                  sessionId={companionSession}
                  pairingPin={companionPinDisplay}
                  pairingHost={pairingHost}
                  onActiveQuestionChange={handleCompanionActiveQuestionChange}
                  onStrokeCountChange={handleStrokeCountChange}
                />
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
                  onClick={() => handleSwitchQuestion(Math.max(0, currentIdx - 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIdx === qList.length - 1}
                  onClick={() => handleSwitchQuestion(Math.min(qList.length - 1, currentIdx + 1))}
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
                  : (q.type === 'SHORT_ANSWER' || q.type === 'DESCRIPTIVE' || !q.options || q.options.length === 0)
                  ? (descriptiveStrokeCounts[q.id] || 0) > 0 ||
                    (descriptiveStrokeCounts[`Q${idx + 1}`] || 0) > 0
                  : !!answers[q.id];
                const isCurrent = idx === currentIdx;
                const isFlag = !!flagged[idx];

                let btnClass = 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                if (isAnswered) btnClass = 'bg-emerald-600 text-white border-emerald-500 font-bold';
                if (isFlag) btnClass = 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500 font-bold';
                if (isCurrent) btnClass += ' ring-2 ring-emerald-500 dark:ring-white';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSwitchQuestion(idx)}
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

      {/* Non-Disruptive In-DOM Submission Confirmation Modal */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <Send className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-700 dark:text-cyan-400 font-extrabold block">
                SUBMISSION CONFIRMATION
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Finalize & Submit Exam?
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Questions Answered:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {Object.keys(answers).length + Object.keys(codingAnswers).length} / {examData?.questions?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Trust Score:</span>
                <span className={`font-mono font-bold ${trustScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {trustScore}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 leading-relaxed">
                Once submitted, your responses and digital companion strokes will be locked. Fullscreen proctoring will conclude automatically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={() => submitExam()}
                disabled={submitting}
                className="py-3 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Yes, Submit Exam</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Proctor Exit Pass Modal */}
      {showExitPassModal && exitPassCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-extrabold block">
                EXAMINATION SUBMITTED SUCCESSFULLY
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Proctor Exit Pass Code
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="font-mono text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-[0.25em] py-2 select-all">
                {exitPassCode}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Enter this 6-digit verification code on your mobile companion phone to safely unlock Kiosk Lockdown mode.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowExitPassModal(false)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <span>Done • View Full Results</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
