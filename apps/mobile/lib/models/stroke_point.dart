import 'dart:ui';

/// Represents a single point in a digital ink stroke with pressure and timestamp.
class StrokePoint {
  final double x;
  final double y;
  final double pressure;
  final int timestamp; // Milliseconds since epoch

  const StrokePoint({
    required this.x,
    required this.y,
    this.pressure = 1.0,
    required this.timestamp,
  });

  Offset toOffset() => Offset(x, y);

  Map<String, dynamic> toJson() => {
        'x': double.parse(x.toStringAsFixed(2)),
        'y': double.parse(y.toStringAsFixed(2)),
        'p': double.parse(pressure.toStringAsFixed(3)),
        't': timestamp,
      };

  factory StrokePoint.fromJson(Map<String, dynamic> json) => StrokePoint(
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        pressure: (json['p'] as num?)?.toDouble() ?? 1.0,
        timestamp: (json['t'] as num).toInt(),
      );
}
