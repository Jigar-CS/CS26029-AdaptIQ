import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'kiosk_service.dart';
import '../models/stroke.dart';
import '../models/sync_packet.dart';

enum SyncStatus {
  disconnected,
  connecting,
  connected,
  syncing,
  synced,
  offlineBufferActive,
  error,
}

class SyncEngine {
  final String sessionId;
  String questionId;
  final String wsUrl;

  Function(String questionId, String title)? onRemoteQuestionChanged;
  Function(List<Map<String, String>> questions)? onDynamicQuestionsReceived;
  Function(String exitPass)? onExamSubmitted;
  Function()? onSessionReset;
  String? remoteExitPass;

  WebSocketChannel? _channel;
  StreamSubscription? _channelSubscription;
  Timer? _syncTimer;
  Timer? _debouncedSyncTimer;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;

  bool _isConnected = false;
  bool _isConnecting = false;
  bool get isConnected => _isConnected;

  int _sequenceNumber = 0;
  final List<Stroke> _pendingDelta = [];
  final List<String> _deletedDelta = [];
  final ValueNotifier<SyncStatus> statusNotifier = ValueNotifier(SyncStatus.disconnected);
  final ValueNotifier<DateTime?> lastSyncedNotifier = ValueNotifier(null);

  bool _isDisposed = false;

  SyncEngine({
    required this.sessionId,
    required this.questionId,
    required this.wsUrl,
    this.onRemoteQuestionChanged,
    this.onDynamicQuestionsReceived,
    this.onExamSubmitted,
    this.onSessionReset,
  });

  /// Starts the WebSocket connection and the sync loop.
  Future<void> start() async {
    await _restorePendingFromCache();
    _connectWebSocket();
    _startSyncLoop();
    _startHeartbeat();
  }

  void _connectWebSocket() {
    if (_isDisposed || _isConnecting || _isConnected) return;
    _isConnecting = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    statusNotifier.value = SyncStatus.connecting;

    try {
      final uri = Uri.parse('$wsUrl?sessionId=$sessionId&questionId=$questionId');
      _channel = WebSocketChannel.connect(uri);

      _channelSubscription = _channel!.stream.listen(
        (data) => _handleIncomingMessage(data),
        onDone: () => _handleDisconnect('WebSocket closed'),
        onError: (err) => _handleDisconnect(err),
      );

      _channel!.ready.then((_) {
        _isConnecting = false;
        if (!_isDisposed && _channel != null) {
          _isConnected = true;
          statusNotifier.value = SyncStatus.connected;
          debugPrint('[SyncEngine] Connected to laptop WebSocket: $uri');

          // Flush any pending deltas immediately upon connecting
          if (_pendingDelta.isNotEmpty || _deletedDelta.isNotEmpty) {
            performSync();
          }
        }
      }).catchError((err) {
        _isConnecting = false;
        debugPrint('[SyncEngine] Connection handshake error: $err');
        _handleDisconnect(err);
      });
    } catch (e) {
      _isConnecting = false;
      debugPrint('[SyncEngine] Connection error: $e');
      _handleDisconnect(e);
    }
  }

  void _handleIncomingMessage(dynamic rawMessage) {
    try {
      final msg = jsonDecode(rawMessage.toString()) as Map<String, dynamic>;
      final type = msg['type'];

      if (type == 'CANVAS_DELTA_ACK') {
        final ackSeq = msg['seq'] as int?;
        if (ackSeq != null && ackSeq <= _sequenceNumber) {
          _onDeltaAcknowledged();
        }
      } else if (type == 'HEARTBEAT_ACK') {
        _isConnected = true;
      } else if (type == 'SESSION_CONFIG') {
        if (msg['exitPass'] != null) {
          remoteExitPass = msg['exitPass'].toString();
        }
        if (msg['questions'] != null && msg['questions'] is List) {
          try {
            final rawList = msg['questions'] as List;
            final dynamicList = rawList.map((item) {
              final m = item as Map<String, dynamic>;
              return {
                'id': m['id']?.toString() ?? 'Q1',
                'label': m['label']?.toString() ?? m['id']?.toString() ?? 'Q1',
                'title': m['title']?.toString() ?? m['id']?.toString() ?? 'Question',
              };
            }).toList();
            if (dynamicList.isNotEmpty) {
              onDynamicQuestionsReceived?.call(dynamicList);
            }
          } catch (e) {
            debugPrint('[SyncEngine] Error parsing dynamic questions: $e');
          }
        }
        if (msg['activeQuestionId'] != null) {
          final activeQId = msg['activeQuestionId'].toString();
          if (activeQId != questionId) {
            final title = msg['question']?['title']?.toString() ?? activeQId;
            onRemoteQuestionChanged?.call(activeQId, title);
          }
        }
      } else if (type == 'ACTIVE_QUESTION_CHANGED') {
        final activeQId = msg['questionId']?.toString();
        final title = msg['question']?['title']?.toString() ?? msg['title']?.toString() ?? activeQId ?? '';
        if (activeQId != null && activeQId != questionId) {
          onRemoteQuestionChanged?.call(activeQId, title);
        }
      } else if (type == 'EXAM_SUBMITTED') {
        final exitPass = msg['exitPass']?.toString() ?? '';
        remoteExitPass = exitPass;
        onExamSubmitted?.call(exitPass);
      } else if (type == 'RESET_SESSION' || type == 'CANVAS_CLEAR') {
        _pendingDelta.clear();
        _deletedDelta.clear();
        remoteExitPass = null;
        if (msg['activeQuestionId'] != null) {
          questionId = msg['activeQuestionId'].toString().toUpperCase();
        }
        onSessionReset?.call();
      }
    } catch (e) {
      debugPrint('[SyncEngine] Error parsing incoming message: $e');
    }
  }

  /// Switches active question, flushing current delta, and notifying server if connected
  Future<void> switchQuestion(String newQuestionId, {bool notifyServer = true}) async {
    if (questionId == newQuestionId) return;

    // Flush current pending delta before switching
    if (_pendingDelta.isNotEmpty || _deletedDelta.isNotEmpty) {
      await performSync();
    }

    questionId = newQuestionId;
    _sequenceNumber = 0;
    _pendingDelta.clear();
    _deletedDelta.clear();

    if (notifyServer && _isConnected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode({
          'type': 'SWITCH_QUESTION',
          'sessionId': sessionId,
          'questionId': newQuestionId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
        debugPrint('[SyncEngine] Notified server of question switch: $newQuestionId');
      } catch (e) {
        debugPrint('[SyncEngine] Failed to notify server of switch: $e');
      }
    }
  }

  void _handleDisconnect([dynamic error]) {
    debugPrint('[SyncEngine] Disconnected: $error');
    _isConnected = false;
    _isConnecting = false;
    statusNotifier.value = _pendingDelta.isNotEmpty
        ? SyncStatus.offlineBufferActive
        : SyncStatus.disconnected;

    _channelSubscription?.cancel();
    _channelSubscription = null;
    _channel = null;

    if (!_isDisposed) {
      _reconnectTimer?.cancel();
      // Auto-reconnect after 2.5 seconds with single active timer
      _reconnectTimer = Timer(const Duration(milliseconds: 2500), () {
        if (!_isDisposed && !_isConnected && !_isConnecting) {
          debugPrint('[SyncEngine] Attempting controlled reconnect...');
          _connectWebSocket();
        }
      });
    }
  }

  /// Appends a new or modified stroke to the pending sync delta buffer.
  void recordStroke(Stroke stroke) {
    _pendingDelta.add(stroke);
    // Ultra-low latency immediate sync for real-time stroke reflection
    _debouncedSyncTimer?.cancel();
    performSync();
  }

  /// Records a deleted stroke ID for incremental eraser delta sync.
  void recordStrokeDeletion(String strokeId) {
    _deletedDelta.add(strokeId);
    _debouncedSyncTimer?.cancel();
    performSync();
  }

  /// Periodic sync loop (safety sync every 5 seconds)
  void _startSyncLoop() {
    _syncTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await performSync();
    });
  }

  void _startHeartbeat() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_isConnected && _channel != null) {
        try {
          _channel!.sink.add(jsonEncode({
            'type': 'HEARTBEAT',
            'sessionId': sessionId,
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          }));
        } catch (e) {
          _handleDisconnect(e);
        }
      }
    });
  }

  void sendLockdownViolation(String reason) {
    if (_isConnected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode({
          'type': 'COMPANION_SECURITY_VIOLATION',
          'sessionId': sessionId,
          'questionId': questionId,
          'reason': reason,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
        debugPrint('[SyncEngine] Sent COMPANION_SECURITY_VIOLATION: $reason');
      } catch (e) {
        debugPrint('[SyncEngine] Failed to send violation: $e');
      }
    }
  }


  /// Performs a delta sync operation.
  Future<void> performSync() async {
    if (_pendingDelta.isEmpty && _deletedDelta.isEmpty) return;

    final strokesToSend = List<Stroke>.from(_pendingDelta);
    final deletedToSend = List<String>.from(_deletedDelta);

    _sequenceNumber++;
    final packet = SyncPacket(
      sessionId: sessionId,
      questionId: questionId,
      sequenceNumber: _sequenceNumber,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      strokesDelta: strokesToSend,
      deletedStrokeIds: deletedToSend,
    );

    // Asynchronously save to offline cache (WAL) without blocking WebSocket transmission
    _savePendingToCache(packet).catchError((e) {
      debugPrint('[SyncEngine] Cache write note: $e');
    });

    if (_isConnected && _channel != null) {
      statusNotifier.value = SyncStatus.syncing;
      try {
        _channel!.sink.add(packet.serialize());
        debugPrint('[SyncEngine] Sent sync packet Seq #$_sequenceNumber with ${strokesToSend.length} strokes');
        _pendingDelta.removeWhere((s) => strokesToSend.contains(s));
        _deletedDelta.removeWhere((id) => deletedToSend.contains(id));
        statusNotifier.value = SyncStatus.synced;
        lastSyncedNotifier.value = DateTime.now();
      } catch (e) {
        _isConnected = false;
        statusNotifier.value = SyncStatus.offlineBufferActive;
        debugPrint('[SyncEngine] Send failed, buffered locally: $e');
        _handleDisconnect(e);
      }
    } else {
      statusNotifier.value = SyncStatus.offlineBufferActive;
      debugPrint('[SyncEngine] Offline: Buffered ${strokesToSend.length} strokes locally.');
      if (!_isDisposed && !_isConnected && !_isConnecting && _reconnectTimer == null) {
        _connectWebSocket();
      }
    }
  }

  void _onDeltaAcknowledged() async {
    // CRITICAL: DO NOT call _pendingDelta.clear() or _deletedDelta.clear() here!
    // performSync() already removed the specific strokes sent in the packet.
    // Any strokes drawn while the packet was in-flight must be preserved in _pendingDelta.
    statusNotifier.value = SyncStatus.synced;
    lastSyncedNotifier.value = DateTime.now();

    // Clear disk cache for this question asynchronously in background
    KioskService().clearCache('cached_strokes_${sessionId}_$questionId').catchError((_) {});
  }

  /// Sends a clear command to the laptop server and clears all local caches for this question
  Future<void> clearRemoteCanvas() async {
    _pendingDelta.clear();
    _deletedDelta.clear();
    _debouncedSyncTimer?.cancel();

    await KioskService().clearCache('cached_strokes_${sessionId}_$questionId');
    await KioskService().clearCache('all_strokes_${sessionId}_$questionId');

    if (_isConnected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode({
          'type': 'CLEAR_CANVAS',
          'sessionId': sessionId,
          'questionId': questionId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
        debugPrint('[SyncEngine] Sent CLEAR_CANVAS to laptop companion server');
      } catch (e) {
        debugPrint('[SyncEngine] Error sending CLEAR_CANVAS: $e');
      }
    }
    statusNotifier.value = SyncStatus.synced;
  }

  Future<void> _savePendingToCache(SyncPacket packet) async {
    try {
      await KioskService().saveCache(
        'cached_strokes_${sessionId}_$questionId',
        packet.serialize(),
      );
    } catch (e) {
      debugPrint('[SyncEngine] Cache write error: $e');
    }
  }

  Future<void> _restorePendingFromCache() async {
    try {
      final cached = await KioskService().getCache('cached_strokes_${sessionId}_$questionId');
      if (cached != null) {
        final decoded = jsonDecode(cached) as Map<String, dynamic>;
        final strokesJson = decoded['strokes'] as List<dynamic>? ?? [];
        for (final item in strokesJson) {
          _pendingDelta.add(Stroke.fromJson(item as Map<String, dynamic>));
        }
        debugPrint('[SyncEngine] Restored ${_pendingDelta.length} offline buffered strokes from cache.');
      }
    } catch (e) {
      debugPrint('[SyncEngine] Cache read error: $e');
    }
  }

  void dispose() {
    _isDisposed = true;
    _isConnected = false;
    _isConnecting = false;
    _reconnectTimer?.cancel();
    _debouncedSyncTimer?.cancel();
    _syncTimer?.cancel();
    _heartbeatTimer?.cancel();
    _channelSubscription?.cancel();
    _channel?.sink.close();
  }
}
