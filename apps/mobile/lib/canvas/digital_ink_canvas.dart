import 'dart:ui';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../models/stroke.dart';
import 'canvas_controller.dart';

class DigitalInkCanvas extends StatefulWidget {
  final CanvasController controller;

  const DigitalInkCanvas({
    super.key,
    required this.controller,
  });

  @override
  State<DigitalInkCanvas> createState() => _DigitalInkCanvasState();
}

class _DigitalInkCanvasState extends State<DigitalInkCanvas> {
  // Palm Rejection & Multi-touch state
  bool _isStylusActive = false;
  int? _activeDrawingPointer;
  final Map<int, Offset> _activePointers = {};
  double? _lastPanY;

  Offset _toDocPoint(Offset localPoint) {
    return Offset(localPoint.dx, localPoint.dy + widget.controller.scrollOffset);
  }

  void _onPointerDown(PointerDownEvent event) {
    _activePointers[event.pointer] = event.localPosition;

    // 1. Two-finger or multi-touch detected -> Scroll gesture
    if (_activePointers.length >= 2) {
      if (_activeDrawingPointer != null) {
        widget.controller.endStroke();
        _activeDrawingPointer = null;
      }
      _lastPanY = event.localPosition.dy;
      return;
    }

    // 2. Pan / Scroll Tool Active -> Single finger scroll
    if (widget.controller.currentTool == ToolType.pan) {
      _lastPanY = event.localPosition.dy;
      return;
    }

    // 3. Palm Rejection logic for Stylus vs Touch
    final isStylus = event.kind == PointerDeviceKind.stylus ||
        event.kind == PointerDeviceKind.invertedStylus;

    if (isStylus) {
      _isStylusActive = true;
    } else if (_isStylusActive && event.kind == PointerDeviceKind.touch) {
      // Finger touch while stylus is active: Treat as scroll or reject
      _lastPanY = event.localPosition.dy;
      return;
    }

    // Only reject palm rest when writing with an active stylus, or when accidental contact is extraordinarily large
    if (_isStylusActive && (event.size > 0.85 || event.radiusMajor > 80.0)) {
      return;
    }

    if (_activeDrawingPointer != null) return;

    _activeDrawingPointer = event.pointer;
    widget.controller.startStroke(_toDocPoint(event.localPosition), event.pressure);
  }

  void _onPointerMove(PointerMoveEvent event) {
    _activePointers[event.pointer] = event.localPosition;

    // 1. Multi-finger vertical scroll
    if (_activePointers.length >= 2) {
      if (_lastPanY != null) {
        final dy = event.localPosition.dy - _lastPanY!;
        widget.controller.scrollBy(-dy);
      }
      _lastPanY = event.localPosition.dy;
      return;
    }

    // 2. Pan / Hand Tool scroll
    if (widget.controller.currentTool == ToolType.pan) {
      if (_lastPanY != null) {
        final dy = event.localPosition.dy - _lastPanY!;
        widget.controller.scrollBy(-dy);
      }
      _lastPanY = event.localPosition.dy;
      return;
    }

    // 3. Finger scroll while S-Pen is primary drawing instrument
    if (_isStylusActive && event.kind == PointerDeviceKind.touch) {
      if (_lastPanY != null) {
        final dy = event.localPosition.dy - _lastPanY!;
        widget.controller.scrollBy(-dy);
      }
      _lastPanY = event.localPosition.dy;
      return;
    }

    // 4. Drawing stroke
    if (event.pointer == _activeDrawingPointer) {
      widget.controller.appendPoint(_toDocPoint(event.localPosition), event.pressure);
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    _activePointers.remove(event.pointer);
    _lastPanY = null;

    if (event.pointer == _activeDrawingPointer) {
      widget.controller.endStroke();
      _activeDrawingPointer = null;

      if (event.kind == PointerDeviceKind.stylus) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted && _activeDrawingPointer == null) {
            _isStylusActive = false;
          }
        });
      }
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    _activePointers.remove(event.pointer);
    _lastPanY = null;

    if (event.pointer == _activeDrawingPointer) {
      widget.controller.endStroke();
      _activeDrawingPointer = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 1. Main Interactive Drawing Surface
        Positioned.fill(
          child: Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: _onPointerDown,
            onPointerMove: _onPointerMove,
            onPointerUp: _onPointerUp,
            onPointerCancel: _onPointerCancel,
            child: AnimatedBuilder(
              animation: widget.controller,
              builder: (context, _) {
                return CustomPaint(
                  painter: InkPainter(
                    strokes: widget.controller.strokes,
                    activeStroke: widget.controller.activeStroke,
                    scrollOffset: widget.controller.scrollOffset,
                    maxScroll: widget.controller.maxScroll,
                  ),
                  size: Size.infinite,
                );
              },
            ),
          ),
        ),

        // 2. Right-edge Quick Scroll Controls
        Positioned(
          right: 12,
          bottom: 20,
          child: AnimatedBuilder(
            animation: widget.controller,
            builder: (context, _) {
              final offset = widget.controller.scrollOffset;
              final max = widget.controller.maxScroll;
              final pageNum = (offset / 750.0).floor() + 1;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withOpacity(0.85),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Scroll Up Button
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_up_rounded, color: Colors.white, size: 22),
                      tooltip: 'Scroll Up',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: offset > 0
                          ? () => widget.controller.scrollBy(-260)
                          : null,
                    ),

                    // Page Indicator Chip
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF4F46E5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'P$pageNum',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),

                    // Scroll Down Button
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 22),
                      tooltip: 'Scroll Down',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: offset < max
                          ? () => widget.controller.scrollBy(260)
                          : null,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class InkPainter extends CustomPainter {
  final List<Stroke> strokes;
  final Stroke? activeStroke;
  final double scrollOffset;
  final double maxScroll;

  InkPainter({
    required this.strokes,
    this.activeStroke,
    required this.scrollOffset,
    required this.maxScroll,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double totalHeight = size.height + maxScroll;

    canvas.save();
    canvas.translate(0, -scrollOffset);

    // 1. Clean Paper Background
    final bgPaint = Paint()..color = Colors.white;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, totalHeight), bgPaint);

    // 2. Ruled guidelines (36px spacing)
    final gridPaint = Paint()
      ..color = const Color(0xFFF1F5F9)
      ..strokeWidth = 1.0;
    for (double y = 48.0; y < totalHeight; y += 36.0) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // 3. Left Red Margin Rule
    final marginPaint = Paint()
      ..color = const Color(0xFFFEE2E2)
      ..strokeWidth = 1.5;
    canvas.drawLine(Offset(60.0, 0), Offset(60.0, totalHeight), marginPaint);

    // 4. Subtle Page Markers
    final dividerPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 1.0;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int p = 1; p * 750.0 < totalHeight; p++) {
      final double py = p * 750.0;
      canvas.drawLine(Offset(0, py), Offset(size.width, py), dividerPaint);

      textPainter.text = TextSpan(
        text: '— PAGE ${p + 1} —',
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(size.width - textPainter.width - 24, py - 14));
    }

    // 5. Draw all completed strokes
    for (final stroke in strokes) {
      _drawStroke(canvas, stroke);
    }

    // 6. Draw active stroke
    if (activeStroke != null) {
      _drawStroke(canvas, activeStroke!);
    }

    canvas.restore();
  }

  void _drawStroke(Canvas canvas, Stroke stroke) {
    if (stroke.points.isEmpty) return;

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    if (stroke.toolType == ToolType.highlighter) {
      paint
        ..color = stroke.color
        ..strokeWidth = stroke.strokeWidth
        ..blendMode = BlendMode.multiply;
    } else {
      paint
        ..color = stroke.color
        ..strokeWidth = stroke.strokeWidth;
    }

    if (stroke.points.length == 1) {
      canvas.drawCircle(
        stroke.points.first.toOffset(),
        stroke.strokeWidth / 2,
        paint..style = PaintingStyle.fill,
      );
      return;
    }

    // Smooth Quadratic Bézier Path
    final path = Path();
    path.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (int i = 1; i < stroke.points.length; i++) {
      final p0 = stroke.points[i - 1];
      final p1 = stroke.points[i];
      final midX = (p0.x + p1.x) / 2;
      final midY = (p0.y + p1.y) / 2;
      path.quadraticBezierTo(p0.x, p0.y, midX, midY);
    }

    final last = stroke.points.last;
    path.lineTo(last.x, last.y);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant InkPainter oldDelegate) {
    return true;
  }
}
