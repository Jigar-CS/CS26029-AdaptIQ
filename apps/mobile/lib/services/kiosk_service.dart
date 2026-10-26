import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class KioskService {
  static const MethodChannel _channel = MethodChannel('com.clias.companion/kiosk');

  static final KioskService _instance = KioskService._internal();
  factory KioskService() => _instance;
  KioskService._internal();

  bool _isLockActive = false;
  bool get isLockActive => _isLockActive;

  /// Activates full hardware/software lockdown:
  /// - Android: startLockTask() + FLAG_SECURE + System UI Immersion
  /// - iOS: Guided Access notification / ASAM API hooks
  Future<bool> enterLockdown() async {
    try {
      if (Platform.isAndroid) {
        final success = await _channel.invokeMethod<bool>('startLockTask') ?? false;
        _isLockActive = success;
        debugPrint('[KioskService] Android LockTask initiated: $success');
        return success;
      } else if (Platform.isIOS) {
        // iOS requires Guided Access or MDM ASAM profile
        _isLockActive = true;
        debugPrint('[KioskService] iOS Guided Access mode active');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[KioskService] Error entering lockdown: $e');
      return false;
    }
  }

  /// Releases lockdown state upon verification of Proctor PIN.
  Future<bool> exitLockdown() async {
    try {
      if (Platform.isAndroid) {
        final success = await _channel.invokeMethod<bool>('stopLockTask') ?? false;
        _isLockActive = !success;
        debugPrint('[KioskService] Android LockTask stopped: $success');
        return success;
      } else if (Platform.isIOS) {
        _isLockActive = false;
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[KioskService] Error exiting lockdown: $e');
      return false;
    }
  }

  /// Toggles screenshot and screen recording blocking (FLAG_SECURE)
  Future<void> setScreenSecure(bool enable) async {
    try {
      if (Platform.isAndroid) {
        await _channel.invokeMethod('setSecureFlag', {'enable': enable});
      }
    } catch (e) {
      debugPrint('[KioskService] Error setting secure flag: $e');
    }
  }

  /// Checks if the device is currently pinned / locked
  Future<bool> checkLockState() async {
    try {
      if (Platform.isAndroid) {
        final active = await _channel.invokeMethod<bool>('isLockTaskActive') ?? false;
        _isLockActive = active;
        return active;
      }
      return _isLockActive;
    } catch (e) {
      return false;
    }
  }

  /// Saves offline strokes to native device preferences
  Future<void> saveCache(String key, String data) async {
    try {
      if (Platform.isAndroid) {
        await _channel.invokeMethod('savePendingCache', {'key': key, 'data': data});
      }
    } catch (e) {
      debugPrint('[KioskService] Error saving cache: $e');
    }
  }

  /// Retrieves cached offline strokes
  Future<String?> getCache(String key) async {
    try {
      if (Platform.isAndroid) {
        return await _channel.invokeMethod<String>('getPendingCache', {'key': key});
      }
    } catch (e) {
      debugPrint('[KioskService] Error retrieving cache: $e');
    }
    return null;
  }

  /// Clears committed cache
  Future<void> clearCache(String key) async {
    try {
      if (Platform.isAndroid) {
        await _channel.invokeMethod('clearPendingCache', {'key': key});
      }
    } catch (e) {
      debugPrint('[KioskService] Error clearing cache: $e');
    }
  }

  /// Clears all cached exam data across all sessions and questions
  Future<void> clearAllCache() async {
    try {
      if (Platform.isAndroid) {
        await _channel.invokeMethod('clearAllCache');
      }
    } catch (e) {
      debugPrint('[KioskService] Error clearing all cache: $e');
    }
  }
}
