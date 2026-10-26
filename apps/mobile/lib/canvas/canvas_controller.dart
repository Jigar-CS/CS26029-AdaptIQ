import 'dart:math';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/stroke.dart';
import '../models/stroke_point.dart';
import '../services/sync_engine.dart';

class CanvasController extends ChangeNotifier {
  final SyncEngine? syncEngine;
  final Uuid _uuid = const Uuid();

  final List<Stroke> _strokes = [];
  final List<Stroke> _undoStack = [];
  Stroke? _activeStroke;

  ToolType _currentTool = ToolType.pen;
  Color _penColor = Colors.black;
  double _penWidth = 3.0;
  double _highlighterWidth = 18.0;
  double _eraserRadius = 15.0;

  List<Stroke> get strokes => List.unmodifiable(_strokes);
  Stroke? get activeStroke => _activeStroke;
  ToolType get currentTool => _currentTool;
  Color get penColor => _penColor;
  double get currentStrokeWidth {
    switch (_currentTool) {
      case ToolType.pen:
        return _penWidth;
      case ToolType.highlighter:
        return _highlighterWidth;
      case ToolType.eraser:
        return _eraserRadius;
      case ToolType.pan:
        return 0.0;
    }
  }

  double _scrollOffset = 0.0;
  double _maxScroll = 2400.0;

  double get scrollOffset => _scrollOffset;
  double get maxScroll => _maxScroll;

  void setScrollOffset(double offset) {
    final clamped = offset.clamp(0.0, _maxScroll);
    if (clamped != _scrollOffset) {
      _scrollOffset = clamped;
      notifyListeners();
    }
  }

  void scrollBy(double delta) {
    setScrollOffset(_scrollOffset + delta);
  }

  bool get canUndo => _strokes.isNotEmpty;
  bool get canRedo => _undoStack.isNotEmpty;

  CanvasController({this.syncEngine});

  void loadStrokes(List<Stroke> strokes) {
    _strokes.clear();
    _strokes.addAll(strokes);
    notifyListeners();
  }

  void setTool(ToolType tool) {
    _currentTool = tool;
    notifyListeners();
  }

  void setColor(Color color) {
    _penColor = color;
    notifyListeners();
  }

  void setStrokeWidth(double width) {
    if (_currentTool == ToolType.pen) {
      _penWidth = width;
    } else if (_currentTool == ToolType.highlighter) {
      _highlighterWidth = width;
    } else {
      _eraserRadius = width;
    }
    notifyListeners();
  }

  /// Begins a new stroke when pointer touches canvas.
  void startStroke(Offset point, double pressure) {
    if (_currentTool == ToolType.pan) return;
    _undoStack.clear();

    if (_currentTool == ToolType.eraser) {
      _eraseAtPoint(point);
      return;
    }

    final newStroke = Stroke(
      id: _uuid.v4(),
      toolType: _currentTool,
      color: _currentTool == ToolType.highlighter
          ? Colors.yellow.withOpacity(0.4)
          : _penColor,
      strokeWidth: currentStrokeWidth,
      points: [
        StrokePoint(
          x: point.dx,
          y: point.dy,
          pressure: pressure > 0 ? pressure : 1.0,
          timestamp: DateTime.now().millisecondsSinceEpoch,
        ),
      ],
      isComplete: false,
    );

    _activeStroke = newStroke;
    notifyListeners();
  }

  /// Appends point as user draws.
  void appendPoint(Offset point, double pressure) {
    if (_currentTool == ToolType.eraser) {
      _eraseAtPoint(point);
      return;
    }

    if (_activeStroke != null) {
      _activeStroke!.points.add(
        StrokePoint(
          x: point.dx,
          y: point.dy,
          pressure: pressure > 0 ? pressure : 1.0,
          timestamp: DateTime.now().millisecondsSinceEpoch,
        ),
      );
      notifyListeners();
    }
  }

  /// Finalizes stroke upon pointer lift and notifies sync engine.
  void endStroke() {
    if (_activeStroke != null) {
      final finished = _activeStroke!.copyWith(isComplete: true);
      _strokes.add(finished);
      _activeStroke = null;
      syncEngine?.recordStroke(finished);
      notifyListeners();
    }
  }

  /// Erases strokes touching or within radius of pointer.
  void _eraseAtPoint(Offset point) {
    final removed = <Stroke>[];
    _strokes.removeWhere((stroke) {
      final hits = stroke.points.any((p) {
        final dist = sqrt(pow(p.x - point.dx, 2) + pow(p.y - point.dy, 2));
        return dist <= _eraserRadius;
      });
      if (hits) {
        removed.add(stroke);
      }
      return hits;
    });

    if (removed.isNotEmpty) {
      for (final s in removed) {
        syncEngine?.recordStrokeDeletion(s.id);
      }
      notifyListeners();
    }
  }

  void undo() {
    if (_strokes.isNotEmpty) {
      final last = _strokes.removeLast();
      _undoStack.add(last);
      syncEngine?.recordStrokeDeletion(last.id);
      notifyListeners();
    }
  }

  void redo() {
    if (_undoStack.isNotEmpty) {
      final restored = _undoStack.removeLast();
      _strokes.add(restored);
      syncEngine?.recordStroke(restored);
      notifyListeners();
    }
  }

  void clearCanvas() {
    _strokes.clear();
    _undoStack.clear();
    syncEngine?.clearRemoteCanvas();
    notifyListeners();
  }
}
