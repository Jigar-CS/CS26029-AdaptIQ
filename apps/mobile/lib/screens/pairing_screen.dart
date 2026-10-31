import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import 'exam_sheet_screen.dart';
import '../services/kiosk_service.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({super.key});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final TextEditingController _laptopHostController =
      TextEditingController(text: 'clias.onrender.com');
  final TextEditingController _sessionTokenController =
      TextEditingController();
  final TextEditingController _questionIdController =
      TextEditingController(text: 'Q1');

  bool _isLockPermitted = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final permitted = await KioskService().checkLockState();
    setState(() {
      _isLockPermitted = permitted;
    });
  }

  void _launchExamSession() {
    final rawHost = _laptopHostController.text.trim();
    final session = _sessionTokenController.text.trim();
    final question = _questionIdController.text.trim();

    // Clean ephemeral PIN or token (strip spaces and dashes: e.g. '839-214' -> '839214')
    final cleanSession = session.replaceAll(RegExp(r'[-\s]'), '');

    if (rawHost.isEmpty || session.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Expanded(child: Text('Please enter the Companion Host and 6-Digit PIN.')),
            ],
          ),
          backgroundColor: const Color(0xFFE11D48),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    String cleanHost = rawHost.replaceAll(RegExp(r'^https?://'), '').replaceAll(RegExp(r'^wss?://'), '');
    while (cleanHost.endsWith('/')) {
      cleanHost = cleanHost.substring(0, cleanHost.length - 1);
    }

    final bool isSecure = rawHost.startsWith('https://') ||
        rawHost.startsWith('wss://') ||
        cleanHost.contains('onrender.com') ||
        cleanHost.contains('vercel.app') ||
        (!cleanHost.contains(':') && !cleanHost.contains('localhost'));

    final String protocol = isSecure ? 'wss' : 'ws';
    final String companionWsUrl = '$protocol://$cleanHost/companion';

    // Default proctor PIN hash for test ("123456")
    final defaultPinHash = sha256.convert(utf8.encode('123456')).toString();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ExamSheetScreen(
          sessionId: cleanSession,
          questionId: question.isEmpty ? 'Q1' : question.toUpperCase(),
          questionTitle: '${question.isEmpty ? 'Q1' : question.toUpperCase()}: Descriptive Answer Sheet',
          wsUrl: companionWsUrl,
          proctorPinHash: defaultPinHash,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const primaryTeal = Color(0xFF0D9488);
    const primaryCyan = Color(0xFF06B6D4);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 440),
              padding: const EdgeInsets.all(28.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.06),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Status Pill: Secure Companion
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDFA),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF99F6E4)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shield_rounded, size: 13, color: primaryTeal),
                          SizedBox(width: 5),
                          Text(
                            'ADAPTIQ SECURE COMPANION',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.9,
                              color: Color(0xFF0F766E),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // App Icon / Branding
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [primaryTeal, primaryCyan],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: primaryTeal.withOpacity(0.35),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.draw_rounded,
                        color: Colors.white,
                        size: 38,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  const Text(
                    'AdaptIQ Answer Companion',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Pair this phone or tablet with your desktop exam to write handwritten descriptive answers in real time.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.45,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 22),

                  // Kiosk Status Alert
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    decoration: BoxDecoration(
                      color: _isLockPermitted ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _isLockPermitted ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isLockPermitted ? Icons.lock_rounded : Icons.verified_user_rounded,
                          color: _isLockPermitted ? const Color(0xFF2563EB) : const Color(0xFF16A34A),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _isLockPermitted
                                ? 'Device Already Locked (LockTask active)'
                                : 'Kiosk Lockdown Ready (LockTask & FLAG_SECURE)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _isLockPermitted ? const Color(0xFF1E40AF) : const Color(0xFF166534),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Field 1: Companion Host / Server URL
                  TextField(
                    controller: _laptopHostController,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      labelText: '1. Companion Host / Server URL',
                      labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                      hintText: 'e.g. clias.onrender.com or 192.168.1.100:4000',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      helperText: 'Copied from Step 1 on your desktop test screen',
                      helperStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.dns_rounded, color: primaryTeal, size: 20),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: primaryTeal, width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Quick presets
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.cloud_outlined, size: 13, color: primaryTeal),
                        label: const Text('Render Cloud', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        backgroundColor: const Color(0xFFF0FDFA),
                        side: const BorderSide(color: Color(0xFFCCFBF1)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        onPressed: () => _laptopHostController.text = 'clias.onrender.com',
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.wifi_rounded, size: 13, color: Color(0xFF64748B)),
                        label: const Text('Localhost:4000', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        backgroundColor: const Color(0xFFF1F5F9),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        onPressed: () => _laptopHostController.text = 'localhost:4000',
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.phone_android_rounded, size: 13, color: Color(0xFF64748B)),
                        label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        backgroundColor: const Color(0xFFF1F5F9),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        onPressed: () => _laptopHostController.text = '10.0.2.2:4000',
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Field 2: Dynamic 6-Digit PIN or Session Token
                  TextField(
                    controller: _sessionTokenController,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: 1.5),
                    decoration: InputDecoration(
                      labelText: '2. Dynamic 6-Digit PIN / Session Token',
                      labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600, letterSpacing: 0),
                      hintText: 'e.g. 839-214 or 839214',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8), letterSpacing: 0),
                      helperText: 'Displayed in Step 2 on your desktop test screen',
                      helperStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.password_rounded, color: primaryTeal, size: 20),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: primaryTeal, width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Field 3: Question Identifier
                  TextField(
                    controller: _questionIdController,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      labelText: '3. Starting Question (Optional)',
                      labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                      hintText: 'e.g. Q1, Q2, Q3 (defaults to Q1)',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      helperText: 'Syncs automatically when switching questions on desktop',
                      helperStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.format_list_numbered_rounded, color: primaryTeal, size: 20),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: primaryTeal, width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 26),

                  // Primary Connect & Start Button
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0D9488), Color(0xFF0891B2)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0D9488).withOpacity(0.35),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: _launchExamSession,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.lock_open_rounded, size: 20),
                          SizedBox(width: 10),
                          Text(
                            'Connect & Unlock Answer Sheet',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.3,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(Icons.arrow_forward_rounded, size: 18),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Security footer note
                  const Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle_outline_rounded, size: 13, color: Color(0xFF10B981)),
                        SizedBox(width: 5),
                        Text(
                          'Secured with Real-Time Digital Ink Sync & Lockdown',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

