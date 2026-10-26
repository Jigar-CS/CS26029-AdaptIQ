import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'stroke.dart';

/// The sync packet transmitted during the 5-second auto-save loop to the laptop.
class SyncPacket {
  final String sessionId;
  final String questionId;
  final int sequenceNumber;
  final int timestamp;
  final List<Stroke> strokesDelta;
  final List<String> deletedStrokeIds;

  SyncPacket({
    required this.sessionId,
    required this.questionId,
    required this.sequenceNumber,
    required this.timestamp,
    required this.strokesDelta,
    this.deletedStrokeIds = const [],
  });

  Map<String, dynamic> toJson() => {
        'type': 'CANVAS_DELTA',
        'sessionId': sessionId,
        'questionId': questionId,
        'seq': sequenceNumber,
        't': timestamp,
        'strokes': strokesDelta.map((s) => s.toJson()).toList(),
        'deleted': deletedStrokeIds,
        'checksum': generateChecksum(),
      };

  String generateChecksum() {
    final raw = '$sessionId:$questionId:$sequenceNumber:${strokesDelta.length}';
    return sha256.convert(utf8.encode(raw)).toString().substring(0, 16);
  }

  String serialize() => jsonEncode(toJson());
}
