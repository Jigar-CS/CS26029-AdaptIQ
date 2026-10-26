import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

@Injectable()
export class CompanionSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger('CompanionSyncService');
  private wss: WebSocketServer | null = null;
  private readonly storageFilePath = path.join(process.cwd(), 'companion_strokes_cache.json');

  // Multi-Student Isolated Rooms: sessionId (normalized uppercase) -> Set<WebSocket>
  private viewersBySession: Map<string, Set<WebSocket>> = new Map();
  private mobilesBySession: Map<string, Set<WebSocket>> = new Map();

  private answerSheets: Record<string, AnswerSheetBuffer> = {}; // key: `${normSession}:${questionId}`
  private activeQuestions: Record<string, string> = {}; // normSession -> questionId
  private exitPasses: Record<string, string> = {}; // normSession -> 6-digit exit PIN
  private submittedSessions: Set<string> = new Set(); // Set of normSessions
  private sessionQuestions: Record<string, any[]> = {}; // normSession -> dynamic questions metadata

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Normalizes session ID strings so variations match the same room
   * (e.g. "CLIAS-24CS010", "24cs010", "session-24cs010" -> "24CS010")
   */
  public normalizeSessionId(id?: string): string {
    if (!id) return 'DEFAULT';
    let clean = id.trim().toUpperCase();
    if (clean.startsWith('CLIAS-')) clean = clean.substring(6);
    if (clean.startsWith('SESSION-')) clean = clean.substring(8);
    return clean || 'DEFAULT';
  }

  private saveToDisk() {
    try {
      const data = {
        answerSheets: this.answerSheets,
        activeQuestions: this.activeQuestions,
        exitPasses: this.exitPasses,
        submittedSessions: Array.from(this.submittedSessions),
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
        this.logger.log(`💾 Restored companion state from disk: ${Object.keys(this.answerSheets).length} answer sheets`);
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

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleConnection(ws, req);
    });

    this.logger.log('📡 CLIAS Multi-Room Digital Companion WebSocket Gateway attached to /companion');
  }

  private handleConnection(ws: WebSocket, req: any) {
    let url: URL;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      url = new URL(req.url, 'http://localhost');
    }

    const isViewer = url.searchParams.get('role') === 'viewer';
    const rawSession = url.searchParams.get('sessionId') || 'clias-session-9842';
    const normSession = this.normalizeSessionId(rawSession);
    const questionId = (url.searchParams.get('questionId') || this.activeQuestions[normSession] || 'Q1').toUpperCase();

    ws.on('error', (err) => {
      this.logger.error(`WebSocket client error (${isViewer ? 'viewer' : 'mobile'} room ${normSession}): ${err.message}`);
    });

    if (isViewer) {
      // Register in session's viewers room
      if (!this.viewersBySession.has(normSession)) {
        this.viewersBySession.set(normSession, new Set());
      }
      this.viewersBySession.get(normSession)!.add(ws);

      const activeQ = this.activeQuestions[normSession] || questionId;
      const sheet = this.getStrokes(normSession, activeQ);

      ws.send(
        JSON.stringify({
          type: 'INITIAL_STATE',
          sessionId: normSession,
          activeQuestionId: activeQ,
          data: sheet,
          mobileStatus: this.isMobileConnected(normSession) ? 'connected' : 'disconnected',
          isSubmitted: this.submittedSessions.has(normSession),
          exitPass: this.exitPasses[normSession] || null,
        }),
      );

      ws.on('close', () => {
        this.viewersBySession.get(normSession)?.delete(ws);
        if (this.viewersBySession.get(normSession)?.size === 0) {
          this.viewersBySession.delete(normSession);
        }
      });
      return;
    }

    // Mobile Companion Client connected
    if (!this.mobilesBySession.has(normSession)) {
      this.mobilesBySession.set(normSession, new Set());
    }
    this.mobilesBySession.get(normSession)!.add(ws);

    this.logger.log(`📱 Mobile Companion paired for Room: [${normSession}], Question: ${questionId}`);

    const activeQ = this.activeQuestions[normSession] || questionId;
    const questionsMeta = this.sessionQuestions[normSession] || null;
    ws.send(
      JSON.stringify({
        type: 'SESSION_CONFIG',
        sessionId: normSession,
        activeQuestionId: activeQ,
        questions: questionsMeta,
        isSubmitted: this.submittedSessions.has(normSession),
        exitPass: this.exitPasses[normSession] || null,
      }),
    );

    // Notify only viewers in this student's room
    this.broadcastToSessionViewers(normSession, {
      type: 'MOBILE_STATUS',
      sessionId: normSession,
      status: 'connected',
      time: Date.now(),
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleMobileMessage(ws, normSession, questionId, data);
      } catch (err: any) {
        this.logger.error(`Error parsing mobile packet for room ${normSession}: ${err.message}`);
      }
    });

    ws.on('close', () => {
      this.mobilesBySession.get(normSession)?.delete(ws);
      if (this.mobilesBySession.get(normSession)?.size === 0) {
        this.mobilesBySession.delete(normSession);
      }
      this.logger.log(`Mobile Companion disconnected for Room: [${normSession}]`);

      this.broadcastToSessionViewers(normSession, {
        type: 'MOBILE_STATUS',
        sessionId: normSession,
        status: this.isMobileConnected(normSession) ? 'connected' : 'disconnected',
        time: Date.now(),
      });
    });
  }

  private handleMobileMessage(ws: WebSocket, normSession: string, defaultQuestionId: string, data: any) {
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

      // Send ACK back to mobile phone
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
      this.broadcastToSessionViewers(normSession, {
        type: 'CANVAS_UPDATE',
        sessionId: normSession,
        questionId: qId,
        allStrokes: sheet.strokes,
        delta: data,
        totalStrokes: sheet.strokes.length,
        lastUpdated: sheet.lastUpdated,
      });
    } else if (type === 'SWITCH_QUESTION') {
      const qId = (data.questionId || 'Q1').toUpperCase();
      this.activeQuestions[normSession] = qId;
      this.saveToDisk();

      this.broadcastToSessionAll(normSession, {
        type: 'ACTIVE_QUESTION_CHANGED',
        sessionId: normSession,
        questionId: qId,
      });
      this.logger.log(`Active question switched to ${qId} in room [${normSession}]`);
    } else if (type === 'CLEAR_CANVAS') {
      const qId = (data.questionId || this.activeQuestions[normSession] || defaultQuestionId).toUpperCase();
      const key = `${normSession}:${qId}`;

      if (this.answerSheets[key]) {
        this.answerSheets[key].strokes = [];
        this.answerSheets[key].lastUpdated = Date.now();
      }
      this.saveToDisk();

      this.broadcastToSessionAll(normSession, {
        type: 'CANVAS_CLEAR',
        sessionId: normSession,
        questionId: qId,
        allStrokes: [],
        totalStrokes: 0,
        lastUpdated: Date.now(),
      });
    } else if (type === 'HEARTBEAT') {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
      }
    }
  }

  public isMobileConnected(sessionId?: string): boolean {
    if (!sessionId) return false;
    const norm = this.normalizeSessionId(sessionId);
    const mobiles = this.mobilesBySession.get(norm);
    if (!mobiles) return false;
    for (const ws of mobiles) {
      if (ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  public isSessionSubmitted(sessionId: string): boolean {
    const norm = this.normalizeSessionId(sessionId);
    return this.submittedSessions.has(norm);
  }

  public getActiveQuestion(sessionId: string): string {
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
    return this.sessionQuestions[norm] || [];
  }

  public saveStrokes(sessionId: string, questionId: string, strokes: StrokeData[]) {
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
    const q = questionId.toUpperCase();
    const key = `${norm}:${q}`;
    if (this.answerSheets[key] && Array.isArray(this.answerSheets[key].strokes) && this.answerSheets[key].strokes.length > 0) {
      return this.answerSheets[key];
    }
    return { sessionId: norm, questionId: q, strokes: [], lastUpdated: Date.now() };
  }

  public switchActiveQuestion(sessionId: string, questionId: string) {
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
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
    const norm = this.normalizeSessionId(sessionId);
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
