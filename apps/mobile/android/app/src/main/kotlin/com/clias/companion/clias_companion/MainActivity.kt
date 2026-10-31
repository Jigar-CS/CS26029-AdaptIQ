package com.clias.companion.clias_companion

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val KIOSK_CHANNEL = "com.clias.companion/kiosk"
    private var isKioskDesired: Boolean = false

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, KIOSK_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startLockTask" -> {
                    val success = startKioskLock()
                    result.success(success)
                }
                "stopLockTask" -> {
                    val success = stopKioskLock()
                    result.success(success)
                }
                "isLockTaskActive" -> {
                    result.success(isLockTaskActive())
                }
                "setSecureFlag" -> {
                    val enable = call.argument<Boolean>("enable") ?: true
                    setScreenSecureFlag(enable)
                    result.success(true)
                }
                "enableImmersiveMode" -> {
                    hideSystemUI()
                    result.success(true)
                }
                "savePendingCache" -> {
                    val key = call.argument<String>("key") ?: "cache"
                    val data = call.argument<String>("data") ?: ""
                    val prefs = getSharedPreferences("clias_cache", Context.MODE_PRIVATE)
                    prefs.edit().putString(key, data).apply()
                    result.success(true)
                }
                "getPendingCache" -> {
                    val key = call.argument<String>("key") ?: "cache"
                    val prefs = getSharedPreferences("clias_cache", Context.MODE_PRIVATE)
                    result.success(prefs.getString(key, null))
                }
                "clearPendingCache" -> {
                    val key = call.argument<String>("key") ?: "cache"
                    val prefs = getSharedPreferences("clias_cache", Context.MODE_PRIVATE)
                    prefs.edit().remove(key).apply()
                    result.success(true)
                }
                "clearAllCache" -> {
                    val prefs = getSharedPreferences("clias_cache", Context.MODE_PRIVATE)
                    prefs.edit().clear().apply()
                    result.success(true)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startKioskLock(): Boolean {
        return try {
            isKioskDesired = true

            // 1. If configured as Device Owner via ADB/MDM, configure True LockTask Mode.
            // In True LockTask Mode, Android OS completely removes the swipe-up-and-hold unpin gesture!
            try {
                val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
                val adminComponent = ComponentName(this, AdminReceiver::class.java)
                if (dpm != null && dpm.isDeviceOwnerApp(packageName)) {
                    dpm.setLockTaskPackages(adminComponent, arrayOf(packageName))
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        dpm.setLockTaskFeatures(adminComponent, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                    }
                }
            } catch (e: Exception) {
                // Standard unmanaged device fallback
            }

            // 2. Enforce FLAG_SECURE to prevent screenshot / screen recording / screen mirroring
            setScreenSecureFlag(true)

            // 3. Hide status bar and navigation gestures
            hideSystemUI()

            // 4. Enter Android LockTask (pinned mode or kiosk mode)
            startLockTask()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun stopKioskLock(): Boolean {
        return try {
            isKioskDesired = false
            stopLockTask()
            setScreenSecureFlag(false)
            showSystemUI()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun isLockTaskActive(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
        } else {
            @Suppress("DEPRECATION")
            am.isInLockTaskMode
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            if (isKioskDesired) {
                hideSystemUI()
                if (!isLockTaskActive()) {
                    try {
                        startLockTask()
                    } catch (_: Exception) {}
                }
            }
        } else {
            // When user attempts swipe up / unpin gesture, bring activity immediately back to front
            if (isKioskDesired) {
                bringToFrontAndLock()
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (isKioskDesired) {
            bringToFrontAndLock()
        }
    }

    private fun bringToFrontAndLock() {
        if (!isKioskDesired) return
        try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            am?.moveTaskToFront(taskId, ActivityManager.MOVE_TASK_WITH_HOME)
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
            if (!isLockTaskActive()) {
                startLockTask()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun setScreenSecureFlag(enable: Boolean) {
        runOnUiThread {
            if (enable) {
                window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }

    private fun hideSystemUI() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.let { controller ->
                    controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    // BEHAVIOR_DEFAULT suppresses transient bars on normal swipes
                    controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_DEFAULT
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                )
            }
        }
    }

    private fun showSystemUI() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
    }
}
