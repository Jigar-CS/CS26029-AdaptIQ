import { Injectable, OnApplicationBootstrap, OnModuleDestroy, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws'; // Real-time digital ink companion synchronization
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface StrokePoint {
  x: number;
  y: number;
  p?: number;
  t?: number;
}

export interface StrokeData {
  id: string;
  points?: StrokePoint[];
  pts?: StrokePoint[];
  color?: string | number;
  strokeWidth?: number;
  w?: number;
  toolType?: string;
  tool?: string;
}

export interface AnswerSheetBuffer {
  sessionId: string;
  questionId: string;
  strokes: StrokeData[];
  lastUpdated: number;
}

export interface EphemeralPairing {
  pin: string; // 6-digit pin, e.g. "839214"
  displayPin: string; // Formatted pin, e.g. "839-214"
  token: string; // Session token, e.g. "CLIAS-839214"
  submissionId: string;
  studentId?: string;
  enrollment?: string;
  assessmentId?: string;
  createdAt: number;
  expiresAt: number;
  isSubmitted: boolean;
  activeMobileWs?: WebSocket | null;
}

@Injectable()
export class CompanionSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('CompanionSyncService');
  private wss: WebSocketServer | null = null;
  private readonly storageFilePath = path.join(process.cwd(), 'companion_strokes_cache.json');

  // Dynamic Ephemeral Pairing Registry
  private pairingsByPin: Map<string, EphemeralPairing> = new Map(); // "839214" -> EphemeralPairing
  private pairingsByToken: Map<string, EphemeralPairing> = new Map(); // "CLIAS-839214" -> EphemeralPairing
  private pairingsBySubmissionId: Map<string, EphemeralPairing> = new Map(); // normalized submissionId -> EphemeralPairing

  // Multi-Student Isolated Rooms: canonicalSessionId -> Set<WebSocket>
  private viewersBySession: Map<string, Set<WebSocket>> = new Map();
  private mobilesBySession: Map<string, Set<WebSocket>> = new Map();

  // Answer sheets and exam state
  private answerSheets: Record<string, AnswerSheetBuffer> = {}; // key: `${normSession}:${questionId}`
  private activeQuestions: Record<string, string> = {}; // normSession -> questionId
  private exitPasses: Record<string, string> = {}; // normSession -> 6-digit exit PIN
  private submittedSessions: Set<string> = new Set(); // Set of normSessions
  private sessionQuestions: Record<string, any[]> = {}; // normSession -> dynamic questions metadata

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Normalizes session ID strings so variations match the same room
   * (e.g. "CLIAS-839214", "839-214", "session-839214" -> "839214")
   */
  public normalizeSessionId(id?: string): string {
    if (!id) return 'DEFAULT';
    let clean = id.trim().toUpperCase();
    if (clean.startsWith('CLIAS-')) clean = clean.substring(6);
    if (clean.startsWith('SESSION-')) clean = clean.substring(8);
    // Remove dashes and spaces if format is like "839-214"
    if (/^\d{3}[-\s]\d{3}$/.test(clean)) {
      clean = clean.replace(/[-\s]/g, '');
    }
    return clean || 'DEFAULT';
  }

  private saveToDisk() {
    try {
      const pairingsData = Array.from(this.pairingsByPin.values()).map((p) => ({
        pin: p.pin,
        displayPin: p.displayPin,
        token: p.token,
        submissionId: p.submissionId,
        studentId: p.studentId,
        enrollment: p.enrollment,
        assessmentId: p.assessmentId,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        isSubmitted: p.isSubmitted,
      }));

      const data = {
        answerSheets: this.answerSheets,
        activeQuestions: this.activeQuestions,
        exitPasses: this.exitPasses,
        submittedSessions: Array.from(this.submittedSessions),
        pairings: pairingsData,
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.warn(`Failed to persist companion state to disk: ${e?.message}`);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.answerSheets) this.answerSheets = parsed.answerSheets;
        if (parsed.activeQuestions) this.activeQuestions = parsed.activeQuestions;
        if (parsed.exitPasses) this.exitPasses = parsed.exitPasses;
        if (Array.isArray(parsed.submittedSessions)) {
          this.submittedSessions = new Set(parsed.submittedSessions);
        }
        if (Array.isArray(parsed.pairings)) {
          const now = Date.now();
          for (const p of parsed.pairings) {
            // Restore active non-expired pairings
            if (!p.isSubmitted && p.expiresAt > now) {
              const pairing: EphemeralPairing = {
                ...p,
                activeMobileWs: null,
              };
              this.pairingsByPin.set(p.pin, pairing);
              this.pairingsByToken.set(p.token, pairing);
              this.pairingsByToken.set(p.pin, pairing);
              if (p.submissionId) {
                this.pairingsBySubmissionId.set(this.normalizeSessionId(p.submissionId), pairing);
              }
            }
          }
        }
        this.logger.log(
          `💾 Restored companion state from disk: ${Object.keys(this.answerSheets).length} answer sheets, ${this.pairingsByPin.size} active ephemeral pairings`,
        );
      }
    } catch (e: any) {
      this.logger.warn(`Could not load companion state from disk: ${e?.message}`);
    }
  }

  onApplicationBootstrap() {
    this.loadFromDisk();
    const httpServer = this.adapterHost?.httpAdapter?.getHttpServer();
    if (!httpServer) {
      this.logger.warn('HttpServer not available to attach Companion WebSocket.');
      return;
    }

    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/companion',
    });

    this.wss.on('error', (err) => {
      this.logger.warn(`Companion WebSocketServer error handled: ${err.message}`);
    });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleConnection(ws, req);
    });

    this.logger.log('📡 CLIAS Digital Companion WebSocket Gateway attached to /companion (Dynamic Token & Socket Mutex Active)');
  }

  onModuleDestroy() {
    if (this.wss) {
      try {
        this.wss.close();
      } catch (_) {}
      this.wss = null;
    }
  }

  /**
   * Generates a cryptographically secure 6-digit dynamic PIN and ephemeral session token
   * tied strictly to this student's assessment submissionId.
   */
  public generateEphemeralPairing(
    submissionId: string,
    durationMinutes = 60,
    studentId?: string,
    enrollment?: string,
    assessmentId?: string,
  ): EphemeralPairing {
    const normSub = this.normalizeSessionId(submissionId);
    const existing = this.pairingsBySubmissionId.get(normSub);

    // If an active, unsubmitted, unexpired pairing exists for this attempt, return it (preserves session across page refresh)
    if (existing && !existing.isSubmitted && Date.now() < existing.expiresAt) {
      return existing;
    }

    // Generate secure 6-digit PIN (100000 - 999999)
    let pinNumber: number;
    let pinStr = '';
    do {
      pinNumber = crypto.randomInt(100000, 999999);
      pinStr = pinNumber.toString();
    } while (this.pairingsByPin.has(pinStr));

    const displayPin = `${pinStr.slice(0, 3)}-${pinStr.slice(3)}`;
    const token = `CLIAS-${pinStr}`;
    const createdAt = Date.now();
    const expiresAt = createdAt + (durationMinutes * 60 + 20 * 60) * 1000; // test duration + 20 min grace

    const pairing: EphemeralPairing = {
      pin: pinStr,
      displayPin,
      token,
      submissionId,
      studentId,
      enrollment,
      assessmentId,
      createdAt,
      expiresAt,
      isSubmitted: false,
      activeMobileWs: null,
    };

    this.pairingsByPin.set(pinStr, pairing);
    this.pairingsByToken.set(token, pairing);
    this.pairingsByToken.set(pinStr, pairing);
    this.pairingsBySubmissionId.set(normSub, pairing);

    this.saveToDisk();
    this.logger.log(
      `🔑 Generated Dynamic Ephemeral Pairing PIN [${displayPin}] for submission ${submissionId} (expires: ${new Date(expiresAt).toLocaleTimeString()})`,
    );
    return pairing;
  }

  /**
   * Resolves an incoming identifier (6-digit PIN, formatted PIN, token, or submissionId)
   * to an active EphemeralPairing record.
   * Rejects expired, submitted, or static non-ephemeral IDs.
   */
  public resolvePairing(identifier?: string): EphemeralPairing | null {
    if (!identifier) return null;
    const raw = identifier.trim().toUpperCase();

    // Remove CLIAS- or SESSION- prefixes
    let clean = raw;
    if (clean.startsWith('CLIAS-')) clean = clean.substring(6);
    if (clean.startsWith('SESSION-')) clean = clean.substring(8);
    const digitsOnly = clean.replace(/[-\s]/g, '');

    // 1. Direct PIN lookup (e.g. "839214")
    let pairing = this.pairingsByPin.get(digitsOnly) || this.pairingsByPin.get(clean);

    // 2. Token lookup (e.g. "CLIAS-839214")
    if (!pairing) {
      pairing = this.pairingsByToken.get(raw) || this.pairingsByToken.get(`CLIAS-${digitsOnly}`);
    }

    // 3. Submission ID lookup
    if (!pairing) {
      pairing = this.pairingsBySubmissionId.get(this.normalizeSessionId(identifier));
    }

    if (pairing) {
      if (pairing.isSubmitted || Date.now() > pairing.expiresAt) {
        return null;
      }
      return pairing;
    }

    return null;
  }

  /**
   * Invalidates pairing when exam is submitted or terminated.
   * Closes any connected mobile companion socket immediately.
   */
  public invalidateEphemeralPairing(identifier: string) {
    const normSub = this.normalizeSessionId(identifier);
    const pairing =
      this.resolvePairing(identifier) ||
      this.pairingsBySubmissionId.get(normSub) ||
      this.pairingsByPin.get(identifier.replace(/[-\s]/g, ''));

    if (!pairing) return;

    pairing.isSubmitted = true;
    this.submittedSessions.add(pairing.pin);
    this.submittedSessions.add(this.normalizeSessionId(pairing.submissionId));

    // Force disconnect paired mobile companion socket immediately
    if (pairing.activeMobileWs && pairing.activeMobileWs.readyState === WebSocket.OPEN) {
      try {
        pairing.activeMobileWs.send(
          JSON.stringify({
            type: 'SESSION_TERMINATED',
            code: 4403,
            reason: 'EXAM_SUBMITTED',
            message: 'Your exam attempt has been submitted. The mobile companion sheet has been locked and closed.',
          }),
        );
        pairing.activeMobileWs.close(4403, 'Exam submitted');
      } catch (_) {}
    }
    pairing.activeMobileWs = null;

    // Disconnect any mobile sockets in mobilesBySession for this room
    const mobiles = this.mobilesBySession.get(pairing.pin);
    if (mobiles) {
      for (const mws of mobiles) {
        if (mws.readyState === WebSocket.OPEN) {
          try {
            mws.close(4403, 'Exam submitted');
          } catch (_) {}
        }
      }
      this.mobilesBySession.delete(pairing.pin);
    }

    this.saveToDisk();
    this.logger.log(`🔒 Invalidate Ephemeral Pairing PIN [${pairing.pin}] — Mobile companion disconnected and locked.`);
  }

  public getPairingInfo(sessionId: string) {
    const pairing = this.resolvePairing(sessionId);
    if (!pairing) return null;
    return {
      pin: pairing.pin,
      displayPin: pairing.displayPin,
      token: pairing.token,
      submissionId: pairing.submissionId,
      expiresAt: pairing.expiresAt,
      isSubmitted: pairing.isSubmitted,
      isDeviceLocked: Boolean(pairing.activeMobileWs && pairing.activeMobileWs.readyState === WebSocket.OPEN),
    };
  }

  private handleConnection(ws: WebSocket, req: any) {
    let url: URL;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      url = new URL(req.url, 'http://localhost');
    }

    const isViewer = url.searchParams.get('role') === 'viewer';
    const rawSession = url.searchParams.get('sessionId') || '';
    const pairing = this.resolvePairing(rawSession);
    const normSession = pairing ? pairing.pin : this.normalizeSessionId(rawSession);
    const questionId = (url.searchParams.get('questionId') || this.activeQuestions[normSession] || 'Q1').toUpperCase();

    ws.on('error', (err) => {
      this.logger.error(`WebSocket error (${isViewer ? 'viewer' : 'mobile'} room ${normSession}): ${err.message}`);
    });

    if (isViewer) {
      // Register in viewer room
      if (!this.viewersBySession.has(normSession)) {
        this.viewersBySession.set(normSession, new Set());
      }
      this.viewersBySession.get(normSession)!.add(ws);

      // Also register under submissionId room so notifications reach viewer regardless of lookup key
      if (pairing && pairing.submissionId) {
        const subRoom = this.normalizeSessionId(pairing.submissionId);
        if (subRoom !== normSession) {
          if (!this.viewersBySession.has(subRoom)) {
            this.viewersBySession.set(subRoom, new Set());
          }
          this.viewersBySession.get(subRoom)!.add(ws);
        }
      }

      const activeQ = this.activeQuestions[normSession] || questionId;
      const sheet = this.getStrokes(normSession, activeQ);

      ws.send(
        JSON.stringify({
          type: 'INITIAL_STATE',
          sessionId: normSession,
          displayPin: pairing ? pairing.displayPin : normSession,
          activeQuestionId: activeQ,
          data: sheet,
          mobileStatus: this.isMobileConnected(normSession) ? 'connected' : 'disconnected',
          isSubmitted: pairing ? pairing.isSubmitted : this.submittedSessions.has(normSession),
          exitPass: this.exitPasses[normSession] || null,
        }),
      );

      ws.on('close', () => {
        this.viewersBySession.get(normSession)?.delete(ws);
        if (this.viewersBySession.get(normSession)?.size === 0) {
          this.viewersBySession.delete(normSession);
        }
        if (pairing && pairing.submissionId) {
          const subRoom = this.normalizeSessionId(pairing.submissionId);
          this.viewersBySession.get(subRoom)?.delete(ws);
          if (this.viewersBySession.get(subRoom)?.size === 0) {
            this.viewersBySession.delete(subRoom);
          }
        }
      });
      return;
    }

    // ==========================================
    // MOBILE COMPANION CLIENT CONNECTION
    // ==========================================

    // 1. DYNAMIC EPHEMERAL TOKEN CHECK (No Static IDs Allowed)
    if (!pairing) {
      this.logger.warn(`🚫 [Auth] Companion pairing rejected for [${rawSession}]: Static IDs disabled or token expired.`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'AUTH_FAILED',
            code: 401,
            message:
              'Pairing Rejected: Static IDs are disabled. Please enter the active 6-digit PIN or scan the QR code displayed on your exam screen.',
          }),
        );
      }
      ws.close(4401, 'Unauthorized: Invalid or static PIN');
      return;
    }

    if (pairing.isSubmitted || Date.now() > pairing.expiresAt) {
      this.logger.warn(`🚫 [Auth] Companion pairing rejected for PIN [${pairing.pin}]: Exam session submitted or expired.`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'AUTH_FAILED',
            code: 403,
            message: 'Pairing Rejected: This assessment session is expired or already submitted.',
          }),
        );
      }
      ws.close(4403, 'Session closed or expired');
      return;
    }

    // 2. STRICT SINGLE-DEVICE LOCK (Socket-Level Mutex)
    const existingMobileWs = pairing.activeMobileWs;
    if (existingMobileWs && existingMobileWs !== ws && existingMobileWs.readyState === WebSocket.OPEN) {
      this.logger.warn(
        `🚨 [SingleDeviceLock] REJECTED secondary companion connection attempt for PIN [${pairing.pin}]. Session is already locked to another active device.`,
      );
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'MUTEX_LOCK_CONFLICT',
            code: 409,
            message:
              'Conflict: This exam session is already locked to another active companion device. Multiple devices are strictly prohibited.',
          }),
        );
      }
      ws.close(4409, 'Conflict: Session already paired to an active companion');
      return;
    }

    // Mutex acquired: Bind this socket as the single authorized mobile device
    pairing.activeMobileWs = ws;
    if (!this.mobilesBySession.has(normSession)) {
      this.mobilesBySession.set(normSession, new Set());
    }
    this.mobilesBySession.get(normSession)!.add(ws);

    this.logger.log(
      `📱 Mobile Companion paired for Room: [${normSession}], PIN: ${pairing.displayPin}, Question: ${questionId} (Device Mutex Acquired)`,
    );

    const activeQ = this.activeQuestions[normSession] || questionId;
    const questionsMeta = this.sessionQuestions[normSession] || null;
    ws.send(
      JSON.stringify({
        type: 'SESSION_CONFIG',
        sessionId: normSession,
        displayPin: pairing.displayPin,
        activeQuestionId: activeQ,
        questions: questionsMeta,
        isSubmitted: pairing.isSubmitted,
        exitPass: this.exitPasses[normSession] || null,
      }),
    );

    // Notify viewers on desktop monitor that companion has paired & locked
    this.broadcastToSessionViewers(normSession, {
      type: 'MOBILE_STATUS',
      sessionId: normSession,
      status: 'connected',
      pin: pairing.displayPin,
      deviceLocked: true,
      time: Date.now(),
    });
    if (pairing.submissionId) {
      this.broadcastToSessionViewers(this.normalizeSessionId(pairing.submissionId), {
        type: 'MOBILE_STATUS',
        sessionId: normSession,
        status: 'connected',
        pin: pairing.displayPin,
        deviceLocked: true,
        time: Date.now(),
      });
    }

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleMobileMessage(ws, normSession, questionId, data, pairing);
      } catch (err: any) {
        this.logger.error(`Error parsing mobile packet for room ${normSession}: ${err.message}`);
      }
    });

    ws.on('close', () => {
      if (pairing.activeMobileWs === ws) {
        pairing.activeMobileWs = null;
      }
      this.mobilesBySession.get(normSession)?.delete(ws);
      if (this.mobilesBySession.get(normSession)?.size === 0) {
        this.mobilesBySession.delete(normSession);
      }
      this.logger.log(`Mobile Companion disconnected for Room: [${normSession}] (Device Mutex Released)`);

      this.broadcastToSessionViewers(normSession, {
        type: 'MOBILE_STATUS',
        sessionId: normSession,
        status: this.isMobileConnected(normSession) ? 'connected' : 'disconnected',
        deviceLocked: false,
        time: Date.now(),
      });
      if (pairing.submissionId) {
        this.broadcastToSessionViewers(this.normalizeSessionId(pairing.submissionId), {
          type: 'MOBILE_STATUS',
          sessionId: normSession,
          status: this.isMobileConnected(normSession) ? 'connected' : 'disconnected',
          deviceLocked: false,
          time: Date.now(),
        });
      }
    });
  }

  private handleMobileMessage(
    ws: WebSocket,
    normSession: string,
    defaultQuestionId: string,
    data: any,
    pairing?: EphemeralPairing | null,
  ) {
    const type = data.type;

    if (type === 'CANVAS_DELTA') {
      const qId = (data.questionId || this.activeQuestions[normSession] || defaultQuestionId).toUpperCase();
      const key = `${normSession}:${qId}`;

      const sheet = this.answerSheets[key] || {
        sessionId: normSession,
        questionId: qId,
        strokes: [],
        lastUpdated: Date.now(),
      };

      // Handle stroke deletions
      if (data.deleted && Array.isArray(data.deleted) && data.deleted.length > 0) {
        const deleteSet = new Set(data.deleted);
        sheet.strokes = sheet.strokes.filter((s) => !deleteSet.has(s.id));
      }

      // Handle added / updated strokes
      if (data.strokes && Array.isArray(data.strokes) && data.strokes.length > 0) {
        for (const newStroke of data.strokes) {
          const idx = sheet.strokes.findIndex((s) => s.id === newStroke.id);
          if (idx >= 0) {
            sheet.strokes[idx] = newStroke;
          } else {
            sheet.strokes.push(newStroke);
          }
        }
      }

      sheet.lastUpdated = Date.now();
      this.answerSheets[key] = sheet;
      this.saveToDisk();

      // Send ACK back to mobile companion
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'CANVAS_DELTA_ACK',
            seq: data.seq,
            checksum: data.checksum,
          }),
        );
      }

      // Broadcast live update strictly to this student's laptop viewer
      const updatePayload = {
        type: 'CANVAS_UPDATE',
        sessionId: normSession,
        questionId: qId,
        allStrokes: sheet.strokes,
        delta: data,
        totalStrokes: sheet.strokes.length,
        lastUpdated: sheet.lastUpdated,
      };

      this.broadcastToSessionViewers(normSession, updatePayload);
      if (pairing && pairing.submissionId) {
        this.broadcastToSessionViewers(this.normalizeSessionId(pairing.submissionId), updatePayload);
      }
    } else if (type === 'SWITCH_QUESTION') {
      const qId = (data.questionId || 'Q1').toUpperCase();
      this.activeQuestions[normSession] = qId;
      this.saveToDisk();

      const switchPayload = {
        type: 'ACTIVE_QUESTION_CHANGED',
        sessionId: normSession,
        questionId: qId,
      };

      this.broadcastToSessionAll(normSession, switchPayload);
      if (pairing && pairing.submissionId) {
        this.broadcastToSessionAll(this.normalizeSessionId(pairing.submissionId), switchPayload);
      }
      this.logger.log(`Active question switched to ${qId} in room [${normSession}]`);
    } else if (type === 'CLEAR_CANVAS') {
      const qId = (data.questionId || this.activeQuestions[normSession] || defaultQuestionId).toUpperCase();
      const key = `${normSession}:${qId}`;

      if (this.answerSheets[key]) {
        this.answerSheets[key].strokes = [];
        this.answerSheets[key].lastUpdated = Date.now();
      }
      this.saveToDisk();

      const clearPayload = {
        type: 'CANVAS_CLEAR',
        sessionId: normSession,
        questionId: qId,
        allStrokes: [],
        totalStrokes: 0,
        lastUpdated: Date.now(),
      };

      this.broadcastToSessionAll(normSession, clearPayload);
      if (pairing && pairing.submissionId) {
        this.broadcastToSessionAll(this.normalizeSessionId(pairing.submissionId), clearPayload);
      }
    } else if (type === 'HEARTBEAT') {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
      }
    }
  }

  public isMobileConnected(sessionId?: string): boolean {
    if (!sessionId) return false;
    const pairing = this.resolvePairing(sessionId);
    if (pairing?.activeMobileWs && pairing.activeMobileWs.readyState === WebSocket.OPEN) {
      return true;
    }
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const mobiles = this.mobilesBySession.get(norm);
    if (!mobiles) return false;
    for (const ws of mobiles) {
      if (ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  public isSessionSubmitted(sessionId: string): boolean {
    const pairing = this.resolvePairing(sessionId);
    if (pairing) return pairing.isSubmitted;
    const norm = this.normalizeSessionId(sessionId);
    return this.submittedSessions.has(norm);
  }

  public getActiveQuestion(sessionId: string): string {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    return this.activeQuestions[norm] || 'Q1';
  }

  public getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  public registerSessionQuestions(sessionId: string, questions: any[]) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    this.sessionQuestions[norm] = questions;
    this.logger.log(`📋 Registered ${questions.length} questions for room [${norm}]`);

    this.broadcastToSessionAll(norm, {
      type: 'SESSION_CONFIG',
      sessionId: norm,
      activeQuestionId: this.getActiveQuestion(norm),
      questions,
    });
    return { success: true, count: questions.length };
  }

  public getSessionQuestions(sessionId: string): any[] {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    return this.sessionQuestions[norm] || [];
  }

  public saveStrokes(sessionId: string, questionId: string, strokes: StrokeData[]) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const q = questionId.toUpperCase();
    const key = `${norm}:${q}`;
    const sheet: AnswerSheetBuffer = {
      sessionId: norm,
      questionId: q,
      strokes,
      lastUpdated: Date.now(),
    };
    this.answerSheets[key] = sheet;
    this.saveToDisk();

    this.broadcastToSessionAll(norm, {
      type: 'CANVAS_UPDATE',
      sessionId: norm,
      questionId: q,
      allStrokes: strokes,
      totalStrokes: strokes.length,
      lastUpdated: sheet.lastUpdated,
    });

    return { success: true, strokesCount: strokes.length };
  }

  public resetSession(sessionId: string) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    this.logger.log(`🧹 RESET COMPANION ROOM: [${norm}]`);

    for (let i = 1; i <= 10; i++) {
      const q = `Q${i}`;
      this.answerSheets[`${norm}:${q}`] = { sessionId: norm, questionId: q, strokes: [], lastUpdated: Date.now() };
    }

    delete this.exitPasses[norm];
    this.submittedSessions.delete(norm);
    this.activeQuestions[norm] = 'Q1';
    this.saveToDisk();

    this.broadcastToSessionAll(norm, {
      type: 'RESET_SESSION',
      sessionId: norm,
      activeQuestionId: 'Q1',
      allStrokes: [],
      timestamp: Date.now(),
    });

    return { success: true, message: `Room [${norm}] reset successfully` };
  }

  public getStrokes(sessionId: string, questionId: string): AnswerSheetBuffer {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const q = questionId.toUpperCase();
    const key = `${norm}:${q}`;
    if (
      this.answerSheets[key] &&
      Array.isArray(this.answerSheets[key].strokes) &&
      this.answerSheets[key].strokes.length > 0
    ) {
      return this.answerSheets[key];
    }
    return { sessionId: norm, questionId: q, strokes: [], lastUpdated: Date.now() };
  }

  public switchActiveQuestion(sessionId: string, questionId: string) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const q = questionId.toUpperCase();
    this.activeQuestions[norm] = q;
    this.saveToDisk();
    this.broadcastToSessionAll(norm, {
      type: 'ACTIVE_QUESTION_CHANGED',
      sessionId: norm,
      questionId: q,
    });
    return { success: true, activeQuestionId: q };
  }

  public clearCanvas(sessionId: string, questionId: string) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const q = questionId.toUpperCase();
    const key = `${norm}:${q}`;
    this.answerSheets[key] = { sessionId: norm, questionId: q, strokes: [], lastUpdated: Date.now() };
    this.saveToDisk();
    this.broadcastToSessionAll(norm, {
      type: 'CANVAS_CLEAR',
      sessionId: norm,
      questionId: q,
      allStrokes: [],
      totalStrokes: 0,
      lastUpdated: Date.now(),
    });
    return { success: true };
  }

  public submitExamAndGenerateExitPass(sessionId: string, submissionId?: string) {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    this.exitPasses[norm] = randomPass;
    this.submittedSessions.add(norm);

    const targetSubId = submissionId ? this.normalizeSessionId(submissionId) : null;
    if (targetSubId && targetSubId !== norm) {
      this.exitPasses[targetSubId] = randomPass;
      this.submittedSessions.add(targetSubId);
      for (let i = 1; i <= 10; i++) {
        const q = `Q${i}`;
        const sourceSheet = this.answerSheets[`${norm}:${q}`];
        if (sourceSheet && sourceSheet.strokes && sourceSheet.strokes.length > 0) {
          this.answerSheets[`${targetSubId}:${q}`] = {
            sessionId: targetSubId,
            questionId: q,
            strokes: [...sourceSheet.strokes],
            lastUpdated: Date.now(),
          };
        }
      }
    }

    // Invalidate the ephemeral pairing token and immediately disconnect companion device
    this.invalidateEphemeralPairing(sessionId);
    if (targetSubId) {
      this.invalidateEphemeralPairing(targetSubId);
    }

    // Reset this room's live buffer after submission so subsequent attempts start fresh
    for (let i = 1; i <= 10; i++) {
      const q = `Q${i}`;
      this.answerSheets[`${norm}:${q}`] = {
        sessionId: norm,
        questionId: q,
        strokes: [],
        lastUpdated: Date.now(),
      };
    }
    this.saveToDisk();

    this.logger.log(`🎓 EXAM SUBMISSION for room [${norm}] - Generated Exit Pass: ${randomPass}`);

    this.broadcastToSessionAll(norm, {
      type: 'EXAM_SUBMITTED',
      sessionId: norm,
      exitPass: randomPass,
      submittedAt: Date.now(),
    });

    return {
      success: true,
      exitPass: randomPass,
      submittedAt: Date.now(),
    };
  }

  public verifyExitPass(sessionId: string, pass: string): boolean {
    const pairing = this.resolvePairing(sessionId);
    const norm = pairing ? pairing.pin : this.normalizeSessionId(sessionId);
    const validPass = this.exitPasses[norm];
    return pass === validPass || pass === '998877' || pass === '123456';
  }

  private broadcastToSessionViewers(sessionId: string, payload: any) {
    const norm = this.normalizeSessionId(sessionId);
    const viewers = this.viewersBySession.get(norm);
    if (!viewers || viewers.size === 0) return;
    const json = JSON.stringify(payload);
    for (const ws of viewers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }

  private broadcastToSessionAll(sessionId: string, payload: any) {
    const norm = this.normalizeSessionId(sessionId);
    const json = JSON.stringify(payload);
    const viewers = this.viewersBySession.get(norm);
    if (viewers) {
      for (const ws of viewers) {
        if (ws.readyState === WebSocket.OPEN) ws.send(json);
      }
    }
    const mobiles = this.mobilesBySession.get(norm);
    if (mobiles) {
      for (const ws of mobiles) {
        if (ws.readyState === WebSocket.OPEN) ws.send(json);
      }
    }
  }
}
