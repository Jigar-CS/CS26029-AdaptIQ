import 'dart:ui';
import 'package:flutter/material.dart';
import 'stroke_point.dart';

enum ToolType {
  pen,
  highlighter,
  eraser,
  pan,
}

/// Represents an individual continuous handwritten stroke on the canvas.
class Stroke {
  final String id;
  final ToolType toolType;
  final Color color;
  final double strokeWidth;
  final List<StrokePoint> points;
  final bool isComplete;
  final int createdAt;

  Stroke({
    required this.id,
    required this.toolType,
    required this.color,
    required this.strokeWidth,
    List<StrokePoint>? points,
    this.isComplete = false,
    int? createdAt,
  })  : points = points ?? [],
        createdAt = createdAt ?? DateTime.now().millisecondsSinceEpoch;

  Stroke copyWith({
    String? id,
    ToolType? toolType,
    Color? color,
    double? strokeWidth,
    List<StrokePoint>? points,
    bool? isComplete,
    int? createdAt,
  }) {
    return Stroke(
      id: id ?? this.id,
      toolType: toolType ?? this.toolType,
      color: color ?? this.color,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      points: points ?? List.from(this.points),
      isComplete: isComplete ?? this.isComplete,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tool': toolType.name,
        'color': color.toARGB32(),
        'w': strokeWidth,
        'pts': points.map((p) => p.toJson()).toList(),
        'c': isComplete,
        't': createdAt,
      };

  factory Stroke.fromJson(Map<String, dynamic> json) => Stroke(
        id: json['id'] as String,
        toolType: ToolType.values.firstWhere(
          (t) => t.name == json['tool'],
          orElse: () => ToolType.pen,
        ),
        color: Color((json['color'] as num).toInt()),
        strokeWidth: (json['w'] as num).toDouble(),
        points: (json['pts'] as List<dynamic>?)
                ?.map((e) => StrokePoint.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        isComplete: json['c'] as bool? ?? true,
        createdAt: (json['t'] as num?)?.toInt() ?? 0,
      );
}
