import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../canvas/canvas_controller.dart';
import '../canvas/digital_ink_canvas.dart';
import '../models/stroke.dart';
import '../services/kiosk_service.dart';
import '../services/sync_engine.dart';
import '../widgets/drawing_toolbar.dart';
import '../widgets/exit_pin_dialog.dart';

class ExamSheetScreen extends StatefulWidget {
  final String sessionId;
  final String questionId;
  final String questionTitle;
  final String wsUrl;
  final String proctorPinHash;

  const ExamSheetScreen({
    super.key,
    required this.sessionId,
    required this.questionId,
    required this.questionTitle,
    required this.wsUrl,
    required this.proctorPinHash,
  });

  @override
  State<ExamSheetScreen> createState() => _ExamSheetScreenState();
}

class _ExamSheetScreenState extends State<ExamSheetScreen>
    with WidgetsBindingObserver {
  late final SyncEngine _syncEngine;
  late final CanvasController _canvasController;

  late String _currentQuestionId;
  late String _currentQuestionTitle;

  List<Map<String, String>> _questions = [
    {'id': 'Q1', 'label': 'Q1', 'title': 'Q1: Descriptive Answer Sheet'},
    {'id': 'Q2', 'label': 'Q2', 'title': 'Q2: Descriptive Answer Sheet'},
    {'id': 'Q3', 'label': 'Q3', 'title': 'Q3: Descriptive Answer Sheet'},
    {'id': 'Q4', 'label': 'Q4', 'title': 'Q4: Descriptive Answer Sheet'},
    {'id': 'Q5', 'label': 'Q5', 'title': 'Q5: Descriptive Answer Sheet'},
  ];

  // Proctor hidden exit gesture detection (5 taps in corner within 3s)
  int _proctorTapCount = 0;
  DateTime? _firstTapTime;
  DateTime? _lastViolationReported;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _currentQuestionId = widget.questionId.toUpperCase();
    _currentQuestionTitle = widget.questionTitle;

    // Lock to horizontal landscape mode for comfortable digital writing
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    _syncEngine = SyncEngine(
      sessionId: widget.sessionId,
      questionId: _currentQuestionId,
      wsUrl: widget.wsUrl,
      onDynamicQuestionsReceived: (newQuestions) {
        if (mounted && newQuestions.isNotEmpty) {
          setState(() {
            _questions = newQuestions;
            final match = _questions.firstWhere(
              (q) => q['id'] == _currentQuestionId,
              orElse: () => _questions.first,
            );
            _currentQuestionTitle = match['title'] ?? _currentQuestionId;
          });
        }
      },
      onRemoteQuestionChanged: (newQId, newTitle) {
        if (mounted && newQId != _currentQuestionId) {
          _switchToQuestion(newQId, newTitle, false);
        }
      },
      onSessionReset: () {
        if (mounted) {
          _handleSessionReset();
        }
      },
      onExamSubmitted: (exitPass) {
        if (mounted) {
          _showExamSubmittedExitDialog(exitPass);
        }
      },
    );
    _syncEngine.start();

    _canvasController = CanvasController(syncEngine: _syncEngine);

    // Restore any previously drawn strokes for the initial question
    _loadExistingStrokes(_currentQuestionId);

    // Fetch dynamic questions list from laptop
    _fetchQuestionsFromLaptop();

    // Enforce instant device lockdown upon entry
    _initiateLockdown();
  }

  Future<void> _fetchQuestionsFromLaptop() async {
    try {
      final bool isSecure = widget.wsUrl.startsWith('wss://');
      final host = widget.wsUrl
          .replaceAll('wss://', '')
          .replaceAll('ws://', '')
          .replaceAll('/companion', '');
      final scheme = isSecure ? 'https' : 'http';
      final httpUrl = Uri.parse('$scheme://$host/api/v1/companion/questions?sessionId=${widget.sessionId}');
      final client = HttpClient();
      final request = await client.getUrl(httpUrl).timeout(const Duration(seconds: 3));
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final rawList = jsonDecode(body) as List<dynamic>;
        if (rawList.isNotEmpty && mounted) {
          final dynamicList = rawList.map((item) {
            final m = item as Map<String, dynamic>;
            return {
              'id': m['id']?.toString() ?? 'Q1',
              'label': m['label']?.toString() ?? m['id']?.toString() ?? 'Q1',
              'title': m['title']?.toString() ?? m['id']?.toString() ?? 'Question',
            };
          }).toList();
          setState(() {
            _questions = dynamicList;
            final match = _questions.firstWhere(
              (q) => q['id'] == _currentQuestionId,
              orElse: () => _questions.first,
            );
            _currentQuestionTitle = match['title'] ?? _currentQuestionId;
          });
        }
      }
    } catch (e) {
      debugPrint('[ExamSheet] Note: Could not fetch questions list from laptop: $e');
    }
  }

  /// Switches active question, auto-saving current strokes before transitioning
  Future<void> _switchToQuestion(String newQId, [String? newTitle, bool notifyServer = true]) async {
    final qId = newQId.toUpperCase();
    if (_currentQuestionId == qId) return;

    // 1. Auto-save current question's strokes locally before switching
    try {
      final currentStrokes = _canvasController.strokes;
      final jsonStrokes = jsonEncode(currentStrokes.map((s) => s.toJson()).toList());
      await KioskService().saveCache('all_strokes_${widget.sessionId}_$_currentQuestionId', jsonStrokes);
    } catch (e) {
      debugPrint('[ExamSheet] Error caching strokes before switch: $e');
    }

    // 2. Perform delta sync to flush any pending strokes to the laptop server
    await _syncEngine.performSync();

    // 3. Clear canvas controller strokes & reset scroll
    _canvasController.loadStrokes([]);
    _canvasController.scrollBy(-_canvasController.scrollOffset);

    // 4. Update sync engine & question state
    final title = newTitle ??
        _questions.firstWhere((q) => q['id'] == qId, orElse: () => {'title': qId})['title']!;

    setState(() {
      _currentQuestionId = qId;
      _currentQuestionTitle = title;
    });

    await _syncEngine.switchQuestion(qId, notifyServer: notifyServer);

    // 5. Restore strokes for the newly selected question
    await _loadExistingStrokes(qId);
  }

  Future<void> _loadExistingStrokes(String targetQId) async {
    // 1. Check local persistent cache
    try {
      final cached = await KioskService().getCache('all_strokes_${widget.sessionId}_$targetQId');
      if (cached != null) {
        final data = jsonDecode(cached) as List<dynamic>;
        final strokes = data.map((e) => Stroke.fromJson(e as Map<String, dynamic>)).toList();
        if (strokes.isNotEmpty && mounted && _currentQuestionId == targetQId) {
          _canvasController.loadStrokes(strokes);
          return;
        }
      }
    } catch (_) {}

    // 2. Fetch from laptop companion server HTTP endpoint
    try {
      final bool isSecure = widget.wsUrl.startsWith('wss://');
      final host = widget.wsUrl
          .replaceAll('wss://', '')
          .replaceAll('ws://', '')
          .replaceAll('/companion', '');
      final scheme = isSecure ? 'https' : 'http';
      final httpUrl = Uri.parse('$scheme://$host/api/v1/companion/strokes?sessionId=${widget.sessionId}&questionId=$targetQId');
      final client = HttpClient();
      final request = await client.getUrl(httpUrl).timeout(const Duration(seconds: 2));
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final json = jsonDecode(body) as Map<String, dynamic>;
        final strokesList = json['strokes'] as List<dynamic>? ?? [];
        final strokes = strokesList.map((e) => Stroke.fromJson(e as Map<String, dynamic>)).toList();
        if (strokes.isNotEmpty && mounted && _currentQuestionId == targetQId) {
          _canvasController.loadStrokes(strokes);
        }
      }
    } catch (e) {
      debugPrint('[ExamSheet] Note: Could not fetch initial strokes from laptop: $e');
    }
  }

  Future<void> _initiateLockdown() async {
    await KioskService().enterLockdown();
  }

  void _handleLockBreachViolation(String reason) {
    final now = DateTime.now();
    if (_lastViolationReported != null && now.difference(_lastViolationReported!).inSeconds < 4) {
      return;
    }
    _lastViolationReported = now;

    // 1. Send real-time security violation packet over WebSocket
    _syncEngine.sendLockdownViolation(reason);

    // 2. Direct HTTP fallback to guarantee recording on faculty panel even if socket is reconnecting
    try {
      final isSecure = widget.wsUrl.startsWith('wss://');
      final host = widget.wsUrl
          .replaceAll('wss://', '')
          .replaceAll('ws://', '')
          .replaceAll('/companion', '');
      final scheme = isSecure ? 'https' : 'http';
      final url = Uri.parse('$scheme://$host/api/v1/companion/violation');
      final client = HttpClient();
      client.postUrl(url).then((req) {
        req.headers.set('content-type', 'application/json');
        req.write(jsonEncode({
          'sessionId': widget.sessionId,
          'reason': reason,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
        return req.close();
      }).catchError((_) {});
    } catch (_) {}

    if (mounted) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.white, size: 22),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'EXAM WARNING: Leaving or unpinning the companion app is logged on the faculty proctor panel.',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFE11D48),
          duration: const Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      debugPrint('[SecurityAlert] App switching / backgrounding attempt detected!');
      _handleLockBreachViolation('COMPANION_UNPINNED');
    } else if (state == AppLifecycleState.resumed) {
      KioskService().checkLockState().then((isLocked) {
        if (!isLocked) {
          debugPrint('[SecurityAlert] Returned to app in unpinned state!');
          _handleLockBreachViolation('COMPANION_UNPINNED');
        }
      });
    }
  }


  void _handleCornerSecretTap() {
    final now = DateTime.now();
    if (_firstTapTime == null || now.difference(_firstTapTime!).inSeconds > 3) {
      _firstTapTime = now;
      _proctorTapCount = 1;
    } else {
      _proctorTapCount++;
      if (_proctorTapCount >= 5) {
        _proctorTapCount = 0;
        _firstTapTime = null;
        _showExitPinDialog();
      }
    }
  }

  Future<void> _handleSessionReset() async {
    debugPrint('[ExamSheet] Received session reset. Clearing all canvas strokes and local cache.');
    try {
      await KioskService().clearAllCache();
      for (var i = 1; i <= 10; i++) {
        await KioskService().clearCache('all_strokes_${widget.sessionId}_Q$i');
      }
    } catch (e) {
      debugPrint('[ExamSheet] Error clearing cache on reset: $e');
    }

    if (mounted) {
      _canvasController.loadStrokes([]);
      _canvasController.scrollBy(-_canvasController.scrollOffset);
      setState(() {
        _currentQuestionId = 'Q1';
        _currentQuestionTitle = _questions.first['title']!;
      });
    }
  }

  void _showExitPinDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => ExitPinDialog(
        expectedPinHash: widget.proctorPinHash,
        dynamicExitPass: _syncEngine.remoteExitPass,
        wsUrl: widget.wsUrl,
        sessionId: widget.sessionId,
        onExitConfirmed: () async {
          Navigator.of(dialogCtx).pop();
          await _handleSessionReset();
          await KioskService().exitLockdown();
          if (!mounted) return;
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showExamSubmittedExitDialog(String exitPass) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => ExitPinDialog(
        expectedPinHash: widget.proctorPinHash,
        dynamicExitPass: exitPass.isNotEmpty ? exitPass : _syncEngine.remoteExitPass,
        wsUrl: widget.wsUrl,
        sessionId: widget.sessionId,
        isExamSubmitted: true,
        onExitConfirmed: () async {
          Navigator.of(dialogCtx).pop();
          await _handleSessionReset();
          await KioskService().exitLockdown();
          if (!mounted) return;
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    _syncEngine.dispose();
    _canvasController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              // 1. Digital Ink Canvas (Full surface with continuous downward vertical scroll)
              Positioned.fill(
                child: DigitalInkCanvas(controller: _canvasController),
              ),

              // 2. Question Palette Bar & Drawing Toolbar (Header in landscape)
              Positioned(
                top: 6,
                left: 10,
                right: 70, // Leave space for secret proctor exit hitbox on far top-right
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Question Switcher Chips (Q1 - Q5)
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.12),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: _questions.map((q) {
                            final isSelected = q['id'] == _currentQuestionId;
                            return GestureDetector(
                              onTap: () => _switchToQuestion(q['id']!),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                margin: const EdgeInsets.symmetric(horizontal: 2),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF4F46E5) : Colors.transparent,
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(
                                  q['label']!,
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Current Question Title Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.edit_note, color: Color(0xFF818CF8), size: 16),
                            const SizedBox(width: 5),
                            Text(
                              _currentQuestionTitle,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Drawing Toolbar (Pen, Highlighter, Eraser, Width, Color, Clear)
                      DrawingToolbar(
                        controller: _canvasController,
                        syncEngine: _syncEngine,
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Hidden Proctor Exit Tap Target (Top-right corner invisible hit-box)
              Positioned(
                top: 0,
                right: 0,
                width: 65,
                height: 50,
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onTap: _handleCornerSecretTap,
                  child: Container(color: Colors.transparent),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
