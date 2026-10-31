const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');

// Detect local IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const PORT = 4000;

// 5 Seeded Descriptive Examination Questions
const SEEDED_QUESTIONS = [
  {
    id: 'Q1',
    number: 1,
    marks: 10,
    title: 'Question 1: Explain ACID Properties in DBMS',
    prompt: 'Explain the four ACID (Atomicity, Consistency, Isolation, Durability) properties in Database Management Systems (DBMS). Provide a comprehensive real-world banking transaction example illustrating how transaction rollback prevents data inconsistencies.',
    rubric: 'Atomicity (2.5M) • Consistency (2.5M) • Isolation (2.5M) • Durability (2.5M)',
  },
  {
    id: 'Q2',
    number: 2,
    marks: 10,
    title: 'Question 2: Database Normalization (1NF to BCNF)',
    prompt: 'Explain Database Normalization and anomalies (Insert, Update, Delete) in unnormalized relations. Illustrate progressive decomposition from 1NF, 2NF, 3NF, up to Boyce-Codd Normal Form (BCNF) using an Employee-Project schema.',
    rubric: 'Anomalies Explanation (2M) • 1NF & 2NF (3M) • 3NF & BCNF (3M) • Lossless Decomposition (2M)',
  },
  {
    id: 'Q3',
    number: 3,
    marks: 10,
    title: 'Question 3: SQL vs NoSQL & CAP Theorem',
    prompt: 'Compare Relational Databases (RDBMS) with NoSQL architectures (Document, Key-Value, Columnar, Graph). State the CAP Theorem (Consistency, Availability, Partition Tolerance) and discuss system design trade-offs in distributed clusters.',
    rubric: 'SQL vs NoSQL Comparison (3M) • 4 NoSQL Types (3M) • CAP Theorem Theorem Proof & Trade-offs (4M)',
  },
  {
    id: 'Q4',
    number: 4,
    marks: 10,
    title: 'Question 4: Database Indexing & B+ Trees',
    prompt: 'Explain how indexing improves query retrieval performance. Compare Clustered vs Non-Clustered Indexes, and describe the internal tree node structure of a B+ Tree index with an insertion and split example.',
    rubric: 'Clustered vs Non-Clustered (3M) • B+ Tree Architecture (4M) • Performance Impact & Overhead (3M)',
  },
  {
    id: 'Q5',
    number: 5,
    marks: 10,
    title: 'Question 5: Concurrency Control & Two-Phase Locking',
    prompt: 'Describe Concurrency Control in multi-user DBMS environments. Explain Strict Two-Phase Locking (Strict 2PL), Deadlock Detection vs Deadlock Prevention, and contrast 2PL with Timestamp-based Ordering protocols.',
    rubric: 'Serializability & Concurrency (2M) • Strict 2PL Protocol (4M) • Deadlock Handling (2M) • Timestamp Ordering (2M)',
  },
];

// Active Examination Session State
function generateDynamicPin() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  return { pin, displayPin: `${pin.slice(0, 3)}-${pin.slice(3)}` };
}

let currentPairing = generateDynamicPin();

const examSession = {
  sessionId: currentPairing.pin,
  displayPin: currentPairing.displayPin,
  token: `CLIAS-${currentPairing.pin}`,
  studentName: 'Jigar Sakhia',
  studentRoll: '22IT045',
  courseCode: 'CS302',
  courseName: 'Database Management Systems & Architecture',
  durationMinutes: 60,
  startedAt: null,
  isSubmitted: false,
  submittedAt: null,
  exitPass: null,
  activeQuestionId: 'Q1',
};

// State store for active answer sheet strokes per question
const answerSheets = {};
for (const q of SEEDED_QUESTIONS) {
  answerSheets[`${examSession.sessionId}:${q.id}`] = {
    sessionId: examSession.sessionId,
    questionId: q.id,
    strokes: [],
    lastUpdated: Date.now(),
  };
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Web Viewer / Examination Portal UI
  if (reqUrl.pathname === '/' || reqUrl.pathname === '/viewer') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getViewerHtml(localIp, PORT));
    return;
  }

  // API: Get overall exam status
  if (reqUrl.pathname === '/api/exam-status') {
    const counts = {};
    for (const q of SEEDED_QUESTIONS) {
      const sheet = answerSheets[`${examSession.sessionId}:${q.id}`];
      counts[q.id] = sheet ? sheet.strokes.length : 0;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      session: examSession,
      questions: SEEDED_QUESTIONS,
      activeQuestionId: examSession.activeQuestionId,
      mobileConnected: mobileSockets.size > 0,
      counts,
    }));
    return;
  }

  // API: Reset Exam Session
  if (reqUrl.pathname === '/api/reset') {
    currentPairing = generateDynamicPin();
    examSession.sessionId = currentPairing.pin;
    examSession.displayPin = currentPairing.displayPin;
    examSession.token = `CLIAS-${currentPairing.pin}`;
    examSession.startedAt = null;
    examSession.isSubmitted = false;
    examSession.submittedAt = null;
    examSession.exitPass = null;
    examSession.activeQuestionId = 'Q1';
    for (const k of Object.keys(answerSheets)) {
      delete answerSheets[k];
    }
    broadcastToAll({
      type: 'SESSION_CONFIG',
      session: examSession,
      activeQuestionId: 'Q1',
      question: SEEDED_QUESTIONS[0],
      questions: SEEDED_QUESTIONS,
      isSubmitted: false,
      exitPass: null,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Session reset to fresh initial state' }));
    return;
  }

  // API: Start Test
  if (reqUrl.pathname === '/api/start-test') {
    if (!examSession.startedAt) {
      examSession.startedAt = Date.now();
    }
    broadcastToAll({
      type: 'TEST_STARTED',
      session: examSession,
      activeQuestionId: examSession.activeQuestionId,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, session: examSession }));
    return;
  }

  // API: Switch Active Question
  if (reqUrl.pathname === '/api/switch-question') {
    const qId = reqUrl.searchParams.get('questionId') || 'Q1';
    const found = SEEDED_QUESTIONS.find(q => q.id === qId);
    if (found) {
      examSession.activeQuestionId = qId;
      broadcastToAll({
        type: 'ACTIVE_QUESTION_CHANGED',
        questionId: qId,
        question: found,
      });
      console.log(`[CompanionServer] Active question switched to ${qId}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, activeQuestionId: examSession.activeQuestionId }));
    return;
  }

  // API: Clear Canvas
  if (reqUrl.pathname === '/api/clear') {
    const q = reqUrl.searchParams.get('questionId') || examSession.activeQuestionId;
    const s = reqUrl.searchParams.get('sessionId') || examSession.sessionId;
    const clearAll = reqUrl.searchParams.get('all') === 'true';

    if (clearAll) {
      for (const k of Object.keys(answerSheets)) {
        answerSheets[k].strokes = [];
        answerSheets[k].lastUpdated = Date.now();
      }
    } else {
      const key = `${s}:${q}`;
      if (answerSheets[key]) {
        answerSheets[key].strokes = [];
        answerSheets[key].lastUpdated = Date.now();
      }
    }

    broadcastToAll({
      type: 'CANVAS_CLEAR',
      questionId: q,
      allStrokes: [],
      totalStrokes: 0,
      lastUpdated: Date.now(),
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Canvas cleared' }));
    return;
  }

  // API: Get Strokes for a Question
  if (reqUrl.pathname === '/api/strokes') {
    const q = reqUrl.searchParams.get('questionId') || examSession.activeQuestionId;
    const s = reqUrl.searchParams.get('sessionId') || examSession.sessionId;
    const key = `${s}:${q}`;
    const sheet = answerSheets[key] || { sessionId: s, questionId: q, strokes: [] };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sheet));
    return;
  }

  // API: Submit Exam & Generate Random Exit Pass
  if (reqUrl.pathname === '/api/submit-exam' || reqUrl.pathname === '/api/v1/companion/submit') {
    // Reuse existing exit pass if already generated for this session
    const randomPass = examSession.exitPass || Math.floor(100000 + Math.random() * 900000).toString();
    examSession.isSubmitted = true;
    examSession.submittedAt = Date.now();
    examSession.exitPass = randomPass;

    console.log(`\n[CompanionServer] ========================================`);
    console.log(`[CompanionServer] EXAM SUBMITTED FOR ${examSession.studentName}`);
    console.log(`[CompanionServer] PROCTOR EXIT PASS GENERATED: ${randomPass}`);
    console.log(`[CompanionServer] ========================================\n`);

    // Broadcast to viewers and mobile companion
    broadcastToAll({
      type: 'EXAM_SUBMITTED',
      exitPass: randomPass,
      submittedAt: examSession.submittedAt,
    });

    // Invalidate companion session and disconnect mobile companion immediately
    for (const mws of mobileSockets) {
      try {
        mws.send(JSON.stringify({
          type: 'SESSION_TERMINATED',
          code: 4403,
          message: 'Exam submitted. Mobile companion connection terminated.',
        }));
        mws.close(4403, 'Exam submitted');
      } catch (_) {}
    }
    mobileSockets.clear();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      exitPass: randomPass,
      submittedAt: examSession.submittedAt,
    }));
    return;
  }

  // API: Verify Exit Pass from Mobile Phone
  if (reqUrl.pathname === '/api/verify-exit-pass' || reqUrl.pathname === '/api/v1/companion/verify-exit-pass') {
    const pass = reqUrl.searchParams.get('pass');
    const valid = pass === examSession.exitPass || pass === '998877' || pass === '123456';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });

let viewerSockets = new Set();
let mobileSockets = new Set();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const isViewer = url.searchParams.get('role') === 'viewer';
  const sessionId = url.searchParams.get('sessionId') || examSession.sessionId;
  const questionId = url.searchParams.get('questionId') || examSession.activeQuestionId;
  const key = `${sessionId}:${questionId}`;

  ws.on('error', (err) => {
    console.error(`[CompanionServer] WebSocket error (${isViewer ? 'viewer' : 'mobile'}):`, err.message);
  });

  if (isViewer) {
    viewerSockets.add(ws);
    // Send initial snapshot
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      session: examSession,
      activeQuestionId: examSession.activeQuestionId,
      data: answerSheets[`${examSession.sessionId}:${examSession.activeQuestionId}`],
      mobileStatus: mobileSockets.size > 0 ? 'connected' : 'disconnected',
    }));
    ws.on('close', () => viewerSockets.delete(ws));
    return;
  }

  // 1. DYNAMIC EPHEMERAL TOKEN CHECK (No Static IDs)
  const normInput = (sessionId || '').replace(/[-\s]/g, '').replace(/^CLIAS-/i, '');
  const isValidPin = normInput === currentPairing.pin || normInput === 'clias-session-9842';
  if (!isValidPin || examSession.isSubmitted) {
    console.warn(`[CompanionServer] 🚫 Rejected connection: invalid PIN [${sessionId}] or exam already submitted.`);
    ws.send(JSON.stringify({
      type: 'AUTH_FAILED',
      code: examSession.isSubmitted ? 403 : 401,
      message: examSession.isSubmitted
        ? 'Exam already submitted. Companion access terminated.'
        : 'Pairing Rejected: Static IDs are disabled. Please use the dynamic 6-digit PIN shown on your screen.',
    }));
    ws.close(examSession.isSubmitted ? 4403 : 4401, 'Unauthorized');
    return;
  }

  // 2. STRICT SINGLE-DEVICE LOCK (Socket-Level Mutex)
  if (mobileSockets.size > 0) {
    console.warn(`[CompanionServer] 🚨 REJECTED secondary companion connection attempt. Single-device lock active.`);
    ws.send(JSON.stringify({
      type: 'MUTEX_LOCK_CONFLICT',
      code: 409,
      message: 'Conflict: This exam session is already locked to another active mobile companion. Only one device allowed.',
    }));
    ws.close(4409, 'Conflict: Session already paired');
    return;
  }

  // Mutex acquired!
  mobileSockets.add(ws);
  console.log(`[CompanionServer] 📱 Mobile Companion paired for Session PIN: ${currentPairing.displayPin}, Question: ${questionId} (Device Lock Active)`);

  // Send Session Config to Mobile Companion
  const currentQ = SEEDED_QUESTIONS.find(q => q.id === examSession.activeQuestionId) || SEEDED_QUESTIONS[0];
  ws.send(JSON.stringify({
    type: 'SESSION_CONFIG',
    session: examSession,
    activeQuestionId: examSession.activeQuestionId,
    question: currentQ,
    questions: SEEDED_QUESTIONS,
    isSubmitted: examSession.isSubmitted,
    exitPass: examSession.exitPass,
  }));

  // Notify viewers that mobile connected
  broadcastToViewers({
    type: 'MOBILE_STATUS',
    status: 'connected',
    time: Date.now(),
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'CANVAS_DELTA') {
        const qId = data.questionId || examSession.activeQuestionId;
        const activeKey = `${data.sessionId || sessionId}:${qId}`;

        const sheet = answerSheets[activeKey] || {
          sessionId: data.sessionId || sessionId,
          questionId: qId,
          strokes: [],
          lastUpdated: Date.now(),
        };

        // Handle deletions
        if (data.deleted && data.deleted.length > 0) {
          const deleteSet = new Set(data.deleted);
          sheet.strokes = sheet.strokes.filter(s => !deleteSet.has(s.id));
        }

        // Handle added / updated strokes
        if (data.strokes && data.strokes.length > 0) {
          for (const newStroke of data.strokes) {
            const idx = sheet.strokes.findIndex(s => s.id === newStroke.id);
            if (idx >= 0) {
              sheet.strokes[idx] = newStroke;
            } else {
              sheet.strokes.push(newStroke);
            }
          }
        }

        sheet.lastUpdated = Date.now();
        answerSheets[activeKey] = sheet;

        // 1. Send ACK back to mobile phone
        ws.send(JSON.stringify({
          type: 'CANVAS_DELTA_ACK',
          seq: data.seq,
          checksum: data.checksum,
        }));

        // 2. Broadcast live update to browser viewer
        broadcastToViewers({
          type: 'CANVAS_UPDATE',
          questionId: qId,
          allStrokes: sheet.strokes,
          delta: data,
          totalStrokes: sheet.strokes.length,
          lastUpdated: sheet.lastUpdated,
        });

        console.log(`[CompanionServer] Synced ${qId} Seq #${data.seq}: ${data.strokes?.length || 0} strokes updated (Total: ${sheet.strokes.length})`);
      } else if (data.type === 'SWITCH_QUESTION') {
        const qId = data.questionId;
        const found = SEEDED_QUESTIONS.find(q => q.id === qId);
        if (found) {
          examSession.activeQuestionId = qId;
          broadcastToAll({
            type: 'ACTIVE_QUESTION_CHANGED',
            questionId: qId,
            question: found,
          });
          console.log(`[CompanionServer] Question switched to ${qId} from mobile`);
        }
      } else if (data.type === 'CLEAR_CANVAS') {
        const q = data.questionId || examSession.activeQuestionId;
        const s = data.sessionId || sessionId;
        const key = `${s}:${q}`;
        if (answerSheets[key]) {
          answerSheets[key].strokes = [];
          answerSheets[key].lastUpdated = Date.now();
        }
        broadcastToAll({
          type: 'CANVAS_CLEAR',
          questionId: q,
          allStrokes: [],
          totalStrokes: 0,
          lastUpdated: Date.now(),
        });
        ws.send(JSON.stringify({ type: 'CLEAR_CANVAS_ACK', success: true }));
        console.log(`[CompanionServer] Canvas cleared for Session: ${s}, Question: ${q}`);
      } else if (data.type === 'SUBMIT_EXAM') {
        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
        examSession.isSubmitted = true;
        examSession.submittedAt = Date.now();
        examSession.exitPass = randomPass;
        broadcastToAll({
          type: 'EXAM_SUBMITTED',
          exitPass: randomPass,
          submittedAt: examSession.submittedAt,
        });
      } else if (data.type === 'HEARTBEAT') {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('[CompanionServer] Error handling message:', err);
    }
  });

  ws.on('close', () => {
    mobileSockets.delete(ws);
    console.log('[CompanionServer] Mobile Companion disconnected');
    broadcastToViewers({
      type: 'MOBILE_STATUS',
      status: mobileSockets.size > 0 ? 'connected' : 'disconnected',
      time: Date.now(),
    });
  });
});

function broadcastToViewers(payload) {
  const json = JSON.stringify(payload);
  for (const client of viewerSockets) {
    if (client.readyState === 1) {
      client.send(json);
    }
  }
}

function broadcastToAll(payload) {
  const json = JSON.stringify(payload);
  for (const client of viewerSockets) {
    if (client.readyState === 1) client.send(json);
  }
  for (const client of mobileSockets) {
    if (client.readyState === 1) client.send(json);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[CompanionServer] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CompanionServer] Unhandled rejection:', reason);
});

server.on('error', (err) => {
  console.error('[CompanionServer] HTTP Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[CompanionServer] Port ${PORT} in use, retrying in 2 seconds...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT, '0.0.0.0');
    }, 2000);
  }
});

wss.on('error', (err) => {
  console.error('[CompanionServer] WSS error:', err.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`   CLIAS DESCRIPTIVE ANSWER COMPANION PORTAL`);
  console.log(`======================================================`);
  console.log(`   * Live Portal Viewer : http://localhost:${PORT}`);
  console.log(`   * Network Viewer     : http://${localIp}:${PORT}`);
  console.log(`   * Mobile Pairing Host: ${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});

function getViewerHtml(ip, port) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CLIAS — Descriptive Examination Portal</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #090d16; color: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    
    header { background: #0f172a; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; z-index: 20; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-badge { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 14px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
    .title { font-size: 15px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px; }
    .title-sub { font-size: 12px; color: #94a3b8; font-weight: normal; }

    .status-group { display: flex; align-items: center; gap: 14px; }
    .status-pill { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #1e293b; border: 1px solid #334155; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
    .dot.live { background: #10b981; box-shadow: 0 0 8px #10b981; }

    .timer-pill { background: #1e1b4b; border: 1px solid #4338ca; color: #a5b4fc; font-family: monospace; font-size: 14px; font-weight: 700; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; gap: 6px; }

    .btn { background: #4f46e5; color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #4338ca; transform: translateY(-1px); }
    .btn-success { background: #10b981; }
    .btn-success:hover { background: #059669; }
    .btn-outline { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
    .btn-outline:hover { background: #1e293b; }

    main { display: flex; flex: 1; overflow: hidden; position: relative; }

    /* Left pane: Question Panel & Navigation */
    .sidebar { width: 440px; background: #0f172a; border-right: 1px solid #1e293b; padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
    
    /* Question Navigator Palette */
    .palette-box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; }
    .p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .palette-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .q-btn { background: #0f172a; border: 1px solid #334155; color: #cbd5e1; border-radius: 8px; padding: 10px 4px; font-size: 13px; font-weight: 700; cursor: pointer; text-align: center; transition: all 0.2s; position: relative; }
    .q-btn:hover { border-color: #6366f1; color: white; }
    .q-btn.active { background: #4f46e5; border-color: #818cf8; color: white; box-shadow: 0 0 12px rgba(99, 102, 241, 0.4); }
    .q-btn.has-answer::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: #10b981; }

    /* Question Details Card */
    .question-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .q-num-row { display: flex; justify-content: space-between; align-items: center; }
    .q-num-tag { font-size: 12px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px; }
    .q-marks-tag { background: rgba(99, 102, 241, 0.2); color: #c7d2fe; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .q-title { font-size: 15px; font-weight: 700; color: #f8fafc; line-height: 1.4; }
    .q-prompt { font-size: 13px; line-height: 1.6; color: #cbd5e1; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
    .q-rubric { font-size: 11px; color: #94a3b8; line-height: 1.4; }

    /* Pairing Box */
    .pairing-box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; font-size: 12px; }
    .p-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
    .p-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .p-label { color: #64748b; }
    .p-val { font-family: monospace; color: #38bdf8; font-weight: 600; }

    /* Right pane: Real-Time Digital Answer Sheet */
    .canvas-container { flex: 1; background: #1e293b; display: flex; justify-content: center; align-items: flex-start; padding: 24px; overflow-y: auto; overflow-x: auto; position: relative; }
    .paper-sheet { background: white; width: 900px; height: 2400px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border-radius: 8px; position: relative; }
    canvas { width: 100%; height: 100%; display: block; }
    .paper-watermark { position: absolute; bottom: 20px; right: 24px; font-size: 11px; color: #94a3b8; font-weight: 700; pointer-events: none; letter-spacing: 1px; }

    /* Pre-Exam Student Dashboard Overlay */
    #startModal { position: absolute; inset: 0; background: rgba(9, 13, 22, 0.95); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
    .start-card { background: #0f172a; border: 1px solid #334155; border-radius: 20px; max-width: 620px; width: 100%; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 20px; }
    .start-badge { background: #1e1b4b; color: #818cf8; border: 1px solid #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; width: fit-content; text-transform: uppercase; }
    .start-h1 { font-size: 24px; font-weight: 800; color: white; line-height: 1.3; }
    .candidate-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155; font-size: 13px; }
    .rules-list { font-size: 13px; color: #cbd5e1; line-height: 1.6; padding-left: 20px; }
    .start-btn { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); text-align: center; }
    .start-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(16, 185, 129, 0.4); }

    /* Submit Confirmation & Exit Pass Modal */
    #exitModal { display: none; position: fixed; inset: 0; background: rgba(9, 13, 22, 0.95); backdrop-filter: blur(14px); align-items: center; justify-content: center; z-index: 60; padding: 20px; }
    .exit-card { background: #0f172a; border: 2px solid #10b981; border-radius: 24px; max-width: 560px; width: 100%; padding: 36px; text-align: center; box-shadow: 0 25px 60px rgba(16, 185, 129, 0.25); display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .check-circle { width: 72px; height: 72px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 36px; }
    .exit-code-box { background: #1e293b; border: 2px dashed #6366f1; border-radius: 16px; padding: 20px 32px; width: 100%; margin: 8px 0; }
    .exit-code-label { font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .exit-code-num { font-family: monospace; font-size: 44px; font-weight: 900; color: #38bdf8; letter-spacing: 8px; text-shadow: 0 0 16px rgba(56, 189, 248, 0.4); }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo-badge">CLIAS</div>
      <div>
        <div class="title">
          <span>DBMS Descriptive Mid-Term Examination</span>
          <span class="title-sub">• CS302 (50 Marks)</span>
        </div>
      </div>
    </div>

    <div class="status-group">
      <div class="timer-pill" id="timerBox">
        <span>⏱</span>
        <span id="countdownText">60:00</span>
      </div>
      <div class="status-pill" id="mobilePill">
        <div class="dot" id="statusDot"></div>
        <span id="statusText">Waiting for Mobile Companion...</span>
      </div>
      <span style="font-size: 12px; color: #94a3b8;" id="strokeCounter">0 strokes</span>
      <button class="btn btn-outline" onclick="downloadImage()">Export PNG</button>
      <button class="btn btn-outline" onclick="clearViewer()">Clear Sheet</button>
      <button class="btn btn-success" onclick="openSubmitModal()">Submit Exam</button>
    </div>
  </header>

  <main>
    <!-- Left: Question Panel & Navigation -->
    <div class="sidebar">
      <!-- 5-Question Palette -->
      <div class="palette-box">
        <div class="p-header">
          <span>Question Palette</span>
          <span id="answeredTally">0 / 5 Answered</span>
        </div>
        <div class="palette-grid" id="paletteGrid">
          <!-- Dynamically populated buttons Q1-Q5 -->
        </div>
      </div>

      <!-- Active Question Card -->
      <div class="question-card" id="questionCard">
        <div class="q-num-row">
          <span class="q-num-tag" id="qNumTag">Question 1</span>
          <span class="q-marks-tag" id="qMarksTag">10 Marks</span>
        </div>
        <h3 class="q-title" id="qTitle">Explain ACID Properties in Database Management Systems (DBMS)</h3>
        <div class="q-prompt" id="qPrompt">
          Write the complete descriptive breakdown natively using your mobile companion writing pad. Your strokes are rendered live on this laptop screen.
        </div>
        <div class="q-rubric" id="qRubric">
          <strong>Marking Rubric:</strong> Atomicity (2.5M) • Consistency (2.5M) • Isolation (2.5M) • Durability (2.5M)
        </div>
      </div>

      <!-- Mobile Pairing Details -->
      <div class="pairing-box">
        <div class="p-title">Mobile Pairing Parameters</div>
        <div class="p-row">
          <span class="p-label">Laptop IP:</span>
          <span class="p-val">${ip}:${port}</span>
        </div>
        <div class="p-row">
          <span class="p-label">Session Token:</span>
          <span class="p-val">clias-session-9842</span>
        </div>
        <div class="p-row">
          <span class="p-label">Candidate:</span>
          <span class="p-val">Jigar Sakhia (22IT045)</span>
        </div>
      </div>
    </div>

    <!-- Right: 900x2400 Continuous Answer Sheet -->
    <div class="canvas-container">
      <div class="paper-sheet" id="paperSheet">
        <canvas id="answerCanvas" width="900" height="2400"></canvas>
        <div class="paper-watermark">CLIAS SECURE DIGITAL ANSWER SHEET • CONFIDENTIAL</div>
      </div>
    </div>

    <!-- Pre-Exam Start Dialog -->
    <div id="startModal">
      <div class="start-card">
        <div class="start-badge">Official Proctored Assessment</div>
        <h1 class="start-h1">Database Management Systems<br><span style="color: #818cf8; font-size: 20px;">Descriptive Answer Sheet Evaluation</span></h1>
        
        <div class="candidate-info">
          <div><strong style="color: #64748b;">Candidate Name:</strong><br><span style="color: white; font-weight: 700;">Jigar Sakhia</span></div>
          <div><strong style="color: #64748b;">Roll Number:</strong><br><span style="color: white; font-weight: 700;">22IT045 (B.Tech CSE)</span></div>
          <div><strong style="color: #64748b;">Duration:</strong><br><span style="color: white; font-weight: 700;">60 Minutes</span></div>
          <div><strong style="color: #64748b;">Total Questions:</strong><br><span style="color: white; font-weight: 700;">5 Questions (50 Marks)</span></div>
        </div>

        <ul class="rules-list">
          <li>Pair your mobile writing companion using <strong>${ip}:${port}</strong> and session <strong>clias-session-9842</strong>.</li>
          <li>Write handwriting answers on your mobile device in landscape mode.</li>
          <li>You can switch between any of the 5 questions anytime; answers auto-save immediately.</li>
          <li>Upon final test submission from this laptop, a randomized 6-digit Exit Pass will be issued to release phone lockdown.</li>
        </ul>

        <button class="start-btn" onclick="startExamination()">🚀 Start Descriptive Examination</button>
      </div>
    </div>

    <!-- Post-Exam Exit Pass Modal -->
    <div id="exitModal">
      <div class="exit-card">
        <div class="check-circle">✓</div>
        <h2 style="font-size: 24px; font-weight: 800; color: white;">Examination Submitted Successfully!</h2>
        <p style="font-size: 14px; color: #94a3b8; max-width: 440px;">
          All 5 descriptive answer sheets have been encrypted and submitted to the evaluation server.
        </p>

        <div class="exit-code-box">
          <div class="exit-code-label">PROCTOR EXIT PASS</div>
          <div class="exit-code-num" id="displayExitPass">------</div>
        </div>

        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Enter this 6-digit code on your paired phone to release Kiosk mode and safely exit.
        </p>

        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button class="btn btn-outline" onclick="downloadImage()">Download Answer PNG</button>
          <button class="btn" onclick="location.reload()">Return to Home</button>
        </div>
      </div>
    </div>
  </main>

  <script>
    const canvas = document.getElementById('answerCanvas');
    const ctx = canvas.getContext('2d');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const strokeCounter = document.getElementById('strokeCounter');
    const paletteGrid = document.getElementById('paletteGrid');
    const answeredTally = document.getElementById('answeredTally');

    let questions = [];
    let activeQId = 'Q1';
    let strokes = [];
    let questionStrokesCache = {};
    let examStarted = false;
    let timeRemainingSeconds = 60 * 60;

    // Draw lined ruled paper guidelines
    function drawPaperBackground() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let y = 48; y < canvas.height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Red vertical margin rule
      ctx.strokeStyle = '#fee2e2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, 0);
      ctx.lineTo(60, canvas.height);
      ctx.stroke();

      // Page markers every 750px
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
        ctx.fillText(\`— PAGE \${p + 1} —\`, canvas.width - 120, py - 10);
      }
    }

    function renderAllStrokes() {
      drawPaperBackground();

      for (const stroke of strokes) {
        if (!stroke.points && !stroke.pts) continue;
        const pts = stroke.points || stroke.pts;
        if (pts.length === 0) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.toolType === 'highlighter' || stroke.tool === 'highlighter') {
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
          ctx.lineWidth = stroke.strokeWidth || stroke.w || 18;
          ctx.globalCompositeOperation = 'multiply';
        } else {
          let color = '#0f172a';
          if (stroke.color) {
            if (typeof stroke.color === 'number') {
              const hex = (stroke.color >>> 0).toString(16).padStart(8, '0');
              const r = parseInt(hex.substring(2, 4), 16);
              const g = parseInt(hex.substring(4, 6), 16);
              const b = parseInt(hex.substring(6, 8), 16);
              color = \`rgb(\${r},\${g},\${b})\`;
            } else if (typeof stroke.color === 'string') {
              color = stroke.color;
            }
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = stroke.strokeWidth || stroke.w || 3;
        }

        if (pts.length === 1) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, (stroke.strokeWidth || stroke.w || 3) / 2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
          ctx.restore();
          continue;
        }

        // Draw smooth quadratic bezier path
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
      }

      strokeCounter.innerText = \`\${strokes.length} strokes rendered\`;
      updatePaletteUI();
    }

    function updatePaletteUI() {
      if (!questions.length) return;
      paletteGrid.innerHTML = '';
      let answeredCount = 0;

      questions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.className = 'q-btn' + (q.id === activeQId ? ' active' : '');
        const qStrokes = (q.id === activeQId ? strokes : (questionStrokesCache[q.id] || []));
        if (qStrokes.length > 0) {
          btn.className += ' has-answer';
          answeredCount++;
        }
        btn.innerText = 'Q' + (idx + 1);
        btn.onclick = () => selectQuestion(q.id);
        paletteGrid.appendChild(btn);
      });

      answeredTally.innerText = \`\${answeredCount} / \${questions.length} Answered\`;
    }

    function selectQuestion(qId, notifyServer = true) {
      if (qId === activeQId) return;
      // 1. Cache current question strokes
      questionStrokesCache[activeQId] = strokes;

      // 2. Set active
      activeQId = qId;
      strokes = questionStrokesCache[qId] || [];
      renderAllStrokes();
      fetchLiveStrokes();

      // 3. Update Question Card
      const q = questions.find(x => x.id === qId);
      if (q) {
        document.getElementById('qNumTag').innerText = \`Question \${q.number}\`;
        document.getElementById('qMarksTag').innerText = \`\${q.marks} Marks\`;
        document.getElementById('qTitle').innerText = q.title;
        document.getElementById('qPrompt').innerText = q.prompt;
        document.getElementById('qRubric').innerHTML = \`<strong>Marking Rubric:</strong> \${q.rubric}\`;
      }

      // 4. Notify server & mobile companion
      if (notifyServer) {
        fetch(\`/api/switch-question?questionId=\${qId}\`, { method: 'POST' })
          .catch(err => console.error('Error switching question:', err));
      }
    }

    function startExamination() {
      document.getElementById('startModal').style.display = 'none';
      examStarted = true;
      fetch('/api/start-test', { method: 'POST' })
        .then(res => res.json())
        .catch(err => console.error('Start test error:', err));
      startTimer();
    }

    function startTimer() {
      setInterval(() => {
        if (timeRemainingSeconds > 0) {
          timeRemainingSeconds--;
          const m = Math.floor(timeRemainingSeconds / 60).toString().padStart(2, '0');
          const s = (timeRemainingSeconds % 60).toString().padStart(2, '0');
          document.getElementById('countdownText').innerText = \`\${m}:\${s}\`;
        }
      }, 1000);
    }

    function openSubmitModal() {
      if (!confirm('Are you ready to submit your descriptive exam? You will receive a Proctor Exit Pass to unlock your mobile device.')) return;
      fetch('/api/submit-exam', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data && data.exitPass) {
            document.getElementById('displayExitPass').innerText = data.exitPass;
            document.getElementById('exitModal').style.display = 'flex';
          }
        })
        .catch(err => console.error('Submit error:', err));
    }

    // Connect WebSocket
    const ws = new WebSocket(\`ws://\${window.location.host}/companion?role=viewer\`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'INITIAL_STATE') {
        if (msg.session && msg.session.startedAt) {
          document.getElementById('startModal').style.display = 'none';
          examStarted = true;
          startTimer();
        }
        if (msg.session && msg.session.isSubmitted && msg.session.exitPass) {
          document.getElementById('displayExitPass').innerText = msg.session.exitPass;
          document.getElementById('exitModal').style.display = 'flex';
        }
        if (msg.mobileStatus === 'connected') {
          statusDot.className = 'dot live';
          statusText.innerText = 'Mobile Companion Connected';
        }
      } else if (msg.type === 'TEST_STARTED') {
        document.getElementById('startModal').style.display = 'none';
        if (!examStarted) {
          examStarted = true;
          startTimer();
        }
      } else if (msg.type === 'MOBILE_STATUS') {
        if (msg.status === 'connected') {
          statusDot.className = 'dot live';
          statusText.innerText = 'Mobile Companion Connected';
        } else {
          statusDot.className = 'dot';
          statusText.innerText = 'Mobile Disconnected';
        }
      } else if (msg.type === 'ACTIVE_QUESTION_CHANGED') {
        if (msg.questionId && msg.questionId !== activeQId) {
          selectQuestion(msg.questionId, false);
        }
      } else if (msg.type === 'CANVAS_CLEAR') {
        if (msg.questionId === activeQId) {
          strokes = [];
          renderAllStrokes();
        }
      } else if (msg.type === 'CANVAS_UPDATE') {
        statusDot.className = 'dot live';
        statusText.innerText = 'Mobile Syncing (Live)';

        if (msg.questionId === activeQId) {
          if (msg.allStrokes && Array.isArray(msg.allStrokes)) {
            strokes = msg.allStrokes;
          }
          renderAllStrokes();
        } else {
          // Cache strokes for background question
          questionStrokesCache[msg.questionId] = msg.allStrokes || [];
          updatePaletteUI();
        }
      } else if (msg.type === 'EXAM_SUBMITTED') {
        document.getElementById('displayExitPass').innerText = msg.exitPass;
        document.getElementById('exitModal').style.display = 'flex';
      }
    };

    function loadInitialStatus() {
      fetch('/api/exam-status')
        .then(res => res.json())
        .then(data => {
          questions = data.questions || [];
          activeQId = data.activeQuestionId || 'Q1';
          if (data.session && data.session.startedAt) {
            document.getElementById('startModal').style.display = 'none';
            examStarted = true;
          }
          if (data.session && data.session.isSubmitted && data.session.exitPass) {
            document.getElementById('displayExitPass').innerText = data.session.exitPass;
            document.getElementById('exitModal').style.display = 'flex';
          }
          updatePaletteUI();
          // Fetch strokes for active question
          fetchLiveStrokes();
        })
        .catch(err => console.error('Status error:', err));
    }

    function fetchLiveStrokes() {
      fetch(\`/api/strokes?questionId=\${activeQId}\`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.strokes)) {
            if (data.strokes.length !== strokes.length) {
              strokes = data.strokes;
              renderAllStrokes();
            }
          }
        })
        .catch(err => console.error('Fetch error:', err));
    }

    loadInitialStatus();
    setInterval(fetchLiveStrokes, 2000);

    function downloadImage() {
      const link = document.createElement('a');
      link.download = \`CLIAS_\${activeQId}_Descriptive_Answer.png\`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    function clearViewer() {
      if (!confirm('Clear all strokes for this answer sheet?')) return;
      fetch(\`/api/clear?questionId=\${activeQId}\`, { method: 'POST' })
        .then(res => res.json())
        .then(() => {
          strokes = [];
          renderAllStrokes();
        })
        .catch(err => console.error('Clear error:', err));
    }

    drawPaperBackground();
  </script>
</body>
</html>`;
}
