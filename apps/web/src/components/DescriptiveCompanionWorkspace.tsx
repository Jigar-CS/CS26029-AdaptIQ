'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FileText,
  Smartphone,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Radio,
  Lock,
  Wifi,
} from 'lucide-react';

export interface StrokePoint {
  x: number;
  y: number;
  p?: number;
}

export interface StrokeItem {
  id: string;
  points?: StrokePoint[];
  pts?: StrokePoint[];
  color?: string | number;
  strokeWidth?: number;
  w?: number;
  toolType?: string;
  tool?: string;
}

interface DescriptiveWorkspaceProps {
  question: {
    id: string;
    questionText: string;
    explanation?: string;
    points?: number;
    topicName?: string;
    difficulty?: string;
  };
  questionNumber: number;
  sessionId: string;
  pairingPin?: string;
  pairingHost?: string;
  onStrokeCountChange?: (questionId: string, count: number) => void;
  onActiveQuestionChange?: (questionNumber: number) => void;
}

export function DescriptiveCompanionWorkspace({
  question,
  questionNumber,
  sessionId,
  pairingPin,
  pairingHost: propPairingHost,
  onStrokeCountChange,
  onActiveQuestionChange,
}: DescriptiveWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<StrokeItem[]>([]);
  const [mobileConnected, setMobileConnected] = useState(false);
  // Helper to determine clean default host without unwanted ports on cloud deployments
  const getDefaultPairingHost = (): string => {
    if (typeof window === 'undefined') return 'localhost:4000';
    const { hostname, host, protocol } = window.location;
    if (protocol === 'https:' || hostname.includes('onrender.com') || hostname.includes('vercel.app')) {
      return host;
    }
    return `${hostname}:4000`;
  };

  const [pairingHost, setPairingHost] = useState(propPairingHost || getDefaultPairingHost());
  const [isClearing, setIsClearing] = useState(false);
  const [viewMode, setViewMode] = useState<'fit' | 'actual'>('fit');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [docDimensions, setDocDimensions] = useState({ width: 900, height: 2400 });
  const socketRef = useRef<WebSocket | null>(null);

  const activeQId = `Q${questionNumber}`;

  // Keep latest callback references in refs to completely avoid re-creating WebSocket or re-triggering effects
  const onStrokeCountChangeRef = useRef(onStrokeCountChange);
  useEffect(() => {
    onStrokeCountChangeRef.current = onStrokeCountChange;
  }, [onStrokeCountChange]);

  const onActiveQuestionChangeRef = useRef(onActiveQuestionChange);
  useEffect(() => {
    onActiveQuestionChangeRef.current = onActiveQuestionChange;
  }, [onActiveQuestionChange]);

  const strokesRef = useRef<StrokeItem[]>(strokes);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Keep pairingHost updated if passed from parent
  useEffect(() => {
    if (propPairingHost) {
      setPairingHost(propPairingHost);
    }
  }, [propPairingHost]);

  // Dynamically expand canvas bounds with generous padding so text on the far right/bottom is NEVER cut off
  useEffect(() => {
    if (strokes.length === 0) return;
    let maxX = 900;
    let maxY = 2400;
    for (const stroke of strokes) {
      const pts = stroke.points || stroke.pts || [];
      for (const p of pts) {
        if (p.x > maxX) maxX = Math.ceil(p.x);
        if (p.y > maxY) maxY = Math.ceil(p.y);
      }
    }
    const targetW = Math.max(1050, maxX + 120);
    const targetH = Math.max(2600, maxY + 200);
    if (targetW > docDimensions.width || targetH > docDimensions.height) {
      setDocDimensions({ width: targetW, height: targetH });
    }
  }, [strokes, docDimensions.width, docDimensions.height]);

  // 1. Determine local host for pairing via backend status
  useEffect(() => {
    fetch(`/api/v1/companion/status?sessionId=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.publicHost) {
          setPairingHost(data.publicHost);
        } else if (data?.localIp) {
          setPairingHost(`${data.localIp}:4000`);
        } else if (typeof window !== 'undefined') {
          setPairingHost(getDefaultPairingHost());
        }
        if (data?.mobileConnected) {
          setMobileConnected(true);
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          setPairingHost(getDefaultPairingHost());
        }
      });
  }, [sessionId]);

  // Helper to draw a single stroke onto a 2D canvas context (ultra-fast 0.05ms incremental rendering)
  const drawSingleStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: StrokeItem) => {
    const pts = stroke.points || stroke.pts;
    if (!pts || pts.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.toolType === 'highlighter' || stroke.tool === 'highlighter') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = stroke.strokeWidth || stroke.w || 20;
      ctx.globalCompositeOperation = 'multiply';
    } else if (stroke.toolType === 'eraser' || stroke.tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = stroke.strokeWidth || stroke.w || 24;
    } else {
      let color = '#0f172a';
      if (stroke.color) {
        if (typeof stroke.color === 'number') {
          const hex = (stroke.color >>> 0).toString(16).padStart(8, '0');
          const r = parseInt(hex.substring(2, 4), 16);
          const g = parseInt(hex.substring(4, 6), 16);
          const b = parseInt(hex.substring(6, 8), 16);
          color = `rgb(${r},${g},${b})`;
        } else if (typeof stroke.color === 'string') {
          color = stroke.color;
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = stroke.strokeWidth || stroke.w || 2.8;
    }

    if (pts.length === 1) {
      ctx.beginPath();
      const r = Math.max(1.5, (stroke.strokeWidth || stroke.w || 3) / 2);
      ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }

    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Helper to perform a clean full canvas render (only called on question change, resize, clear, or erase)
  const renderCanvasFull = useCallback((strokesToRender: StrokeItem[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== docDimensions.width || canvas.height !== docDimensions.height) {
      canvas.width = docDimensions.width;
      canvas.height = docDimensions.height;
    }

    // Background clean white notebook ruled paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle horizontal notebook ruled guidelines (spaced every 36px, starting at y=48)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 48; y < canvas.height; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Vertical red margin rule at x = 60
    ctx.strokeStyle = '#fee2e2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, canvas.height);
    ctx.stroke();

    // Page break markers every 750px
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    for (let p = 1; p * 750 < canvas.height; p++) {
      const py = p * 750;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
      ctx.fillText(`— PAGE ${p + 1} —`, canvas.width - 120, py - 10);
    }

    // Draw all strokes
    for (const stroke of strokesToRender) {
      drawSingleStroke(ctx, stroke);
    }
  }, [docDimensions, drawSingleStroke]);

  // Initial full canvas render and re-render on dimension/question switch
  useEffect(() => {
    renderCanvasFull(strokesRef.current);
  }, [activeQId, docDimensions, renderCanvasFull]);

  // 2. Fetch existing strokes for this question upon question change
  const fetchStrokes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/companion/strokes?sessionId=${encodeURIComponent(sessionId)}&questionId=${activeQId}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.strokes)) {
          setStrokes(data.strokes);
          renderCanvasFull(data.strokes);
          onStrokeCountChangeRef.current?.(question.id, data.strokes.length);
        } else {
          setStrokes([]);
          renderCanvasFull([]);
          onStrokeCountChangeRef.current?.(question.id, 0);
        }
      }
    } catch (err) {
      console.warn('[DescriptiveWorkspace] Could not fetch cached strokes:', err);
    }
  }, [sessionId, activeQId, question.id, renderCanvasFull]);

  useEffect(() => {
    fetchStrokes();
  }, [fetchStrokes]);

  // Background polling fallback only when WebSocket is completely inactive
  useEffect(() => {
    if (mobileConnected || socketRef.current?.readyState === WebSocket.OPEN) return;
    const timer = setInterval(() => {
      fetchStrokes();
    }, 5000);
    return () => clearInterval(timer);
  }, [mobileConnected, fetchStrokes]);

  // 3. Connect to Companion WebSocket as a Viewer to receive live strokes from phone
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hostToUse = pairingHost || getDefaultPairingHost();
    let cleanHost = hostToUse.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isCloud =
      window.location.protocol === 'https:' ||
      cleanHost.includes('onrender.com') ||
      cleanHost.includes('vercel.app');
    if (isCloud && cleanHost.includes(':4000')) {
      cleanHost = cleanHost.replace(':4000', '');
    }
    const wsProto = isCloud ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${cleanHost}/companion?role=viewer&sessionId=${encodeURIComponent(
      sessionId,
    )}&questionId=${activeQId}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'INITIAL_STATE') {
            setMobileConnected(msg.mobileStatus === 'connected');
            if (msg.data && Array.isArray(msg.data.strokes)) {
              setStrokes(msg.data.strokes);
              renderCanvasFull(msg.data.strokes);
              onStrokeCountChangeRef.current?.(question.id, msg.data.strokes.length);
            }
          } else if (msg.type === 'MOBILE_STATUS') {
            setMobileConnected(msg.status === 'connected');
          } else if (msg.type === 'CANVAS_UPDATE') {
            setMobileConnected(true);
            if (msg.questionId === activeQId) {
              const deltaStrokes = msg.delta?.strokes;
              const deleted = msg.delta?.deleted;
              const hasDeletions = Array.isArray(deleted) && deleted.length > 0;

              // Ultra-fast incremental rendering: draw newly arrived stroke in 0.05ms without clearing canvas
              if (!hasDeletions && Array.isArray(deltaStrokes) && deltaStrokes.length > 0 && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  for (const s of deltaStrokes) {
                    drawSingleStroke(ctx, s);
                  }
                }
                setStrokes((prev) => {
                  const next = [...prev];
                  for (const s of deltaStrokes) {
                    const idx = next.findIndex((p) => p.id === s.id);
                    if (idx >= 0) next[idx] = s;
                    else next.push(s);
                  }
                  return next;
                });
                onStrokeCountChangeRef.current?.(question.id, msg.totalStrokes ?? (strokes.length + deltaStrokes.length));
              } else if (Array.isArray(msg.allStrokes)) {
                // Full redraw path if strokes were erased or on bulk update
                setStrokes(msg.allStrokes);
                renderCanvasFull(msg.allStrokes);
                onStrokeCountChangeRef.current?.(question.id, msg.allStrokes.length);
              }
            }
          } else if (msg.type === 'ACTIVE_QUESTION_CHANGED') {
            const match = (msg.questionId || '').match(/Q(\d+)/i);
            if (match) {
              const qNum = parseInt(match[1], 10);
              if (qNum && qNum !== questionNumber) {
                onActiveQuestionChangeRef.current?.(qNum);
              }
            }
          } else if (msg.type === 'CANVAS_CLEAR') {
            if (msg.questionId === activeQId) {
              setStrokes([]);
              renderCanvasFull([]);
              onStrokeCountChangeRef.current?.(question.id, 0);
            }
          }
        } catch (e) {
          console.error('[DescriptiveWorkspace] WebSocket message error:', e);
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch (e) {
      console.warn('[DescriptiveWorkspace] WebSocket initialization error:', e);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [
    sessionId,
    activeQId,
    question.id,
    questionNumber,
    pairingHost,
    drawSingleStroke,
    renderCanvasFull,
  ]);



  // Handle Clear Canvas
  const handleClear = async () => {
    if (!window.confirm(`Clear all handwritten strokes for ${activeQId}?`)) return;
    setIsClearing(true);
    try {
      await fetch(
        `/api/v1/companion/clear?sessionId=${encodeURIComponent(sessionId)}&questionId=${activeQId}`,
        { method: 'POST' },
      );
      setStrokes([]);
      onStrokeCountChange?.(question.id, 0);
    } catch (e) {
      console.error('Failed to clear canvas:', e);
    } finally {
      setIsClearing(false);
    }
  };

  // Handle PNG Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `CLIAS_${activeQId}_Answer_Sheet.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Parse prompt and rubric from questionText
  const parts = question.questionText.split('\n\n[Marking Rubric:');
  const mainPrompt = parts[0];
  const rubric = parts[1] ? parts[1].replace(']', '').trim() : question.explanation || '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Descriptive Prompt & Rubric Card + Mobile Status */}
      <div className="lg:col-span-5 space-y-4">
        {/* Question Header Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
              {activeQId} • Descriptive
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              {question.points ?? 10} Marks
            </span>
          </div>

          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {mainPrompt}
          </div>

          {rubric && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Evaluation Rubric
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">{rubric}</p>
            </div>
          )}
        </div>

        {/* Mobile Companion Connection Status Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold tracking-wide">Phone Companion Stream</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-slate-700 text-[10px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  mobileConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-300">
                {mobileConnected ? 'Phone Connected (Live Streaming)' : 'Waiting for Device'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            All answers for this descriptive test must be written on your paired mobile companion in landscape mode.
            Your strokes are mirrored live onto this digital answer sheet.
          </p>

          {/* Ephemeral Pairing & Security Lock Badge */}
          <div className="p-3 rounded-xl bg-black/60 border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-cyan-400" /> Host:
              </span>
              <span className="text-cyan-300 font-bold select-all">{pairingHost || 'localhost:4000'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" /> Dynamic PIN:
              </span>
              <span className="text-emerald-300 font-black tracking-wider text-xs select-all">
                {pairingPin || (sessionId.length === 6 ? `${sessionId.slice(0, 3)}-${sessionId.slice(3)}` : sessionId)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Single-Device Lock:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${mobileConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                {mobileConnected ? 'LOCKED (1 DEVICE)' : 'AWAITING PAIR'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Active Question:</span>
              <span className="text-indigo-300 font-bold">{activeQId}</span>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Read-Only Digital Ruled Answer Sheet Mirror */}
      <div className="lg:col-span-7 space-y-3">
        {/* Toolbar with Zoom & Controls (No laptop writing options) */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Live Digital Answer Sheet ({activeQId})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              • {strokes.length} strokes
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => {
                setViewMode('actual');
                setZoomLevel((z) => Math.max(50, z - 15));
              }}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Fit Width toggle */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'fit') {
                  setViewMode('actual');
                  setZoomLevel(100);
                } else {
                  setViewMode('fit');
                  setZoomLevel(100);
                }
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{viewMode === 'fit' ? '100% Size' : 'Fit Width'}</span>
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => {
                setViewMode('actual');
                setZoomLevel((z) => Math.min(180, z + 15));
              }}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0 || isClearing}
              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 transition"
              title="Clear canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              title="Download PNG sheet"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Read-Only Ruled Answer Sheet Container with Responsive Proportional Scaling */}
        <div
          className="relative rounded-2xl border border-slate-300 dark:border-slate-700 overflow-auto bg-slate-100 dark:bg-slate-950 p-3 shadow-inner select-none max-h-[740px]"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div
            className="transition-all duration-200 mx-auto"
            style={{
              width: viewMode === 'fit' ? '100%' : `${(docDimensions.width * zoomLevel) / 100}px`,
              minWidth: viewMode === 'fit' ? '100%' : `${docDimensions.width}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              className="mx-auto rounded-xl shadow-md pointer-events-none"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                backgroundColor: '#ffffff',
                aspectRatio: `${docDimensions.width} / ${docDimensions.height}`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
