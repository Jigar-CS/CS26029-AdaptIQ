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
      TextEditingController(text: '10.194.8.196:4000');
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

    if (rawHost.isEmpty || session.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide laptop host and session token')),
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
          sessionId: session,
          questionId: question.toUpperCase(),
          questionTitle: 'Q1: ACID Properties',
          wsUrl: companionWsUrl,
          proctorPinHash: defaultPinHash,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.all(28.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Icon / Branding
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF4F46E5).withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.draw_rounded,
                        color: Colors.white,
                        size: 36,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'CLIAS Answer Companion',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Pair this tablet or phone with your exam portal to begin writing in secure lockdown mode.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 24),

                  // Kiosk Status Alert
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _isLockPermitted ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _isLockPermitted ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isLockPermitted ? Icons.lock : Icons.shield,
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
                              fontWeight: FontWeight.w600,
                              color: _isLockPermitted ? const Color(0xFF1E40AF) : const Color(0xFF166534),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Laptop Host / IP
                  TextField(
                    controller: _laptopHostController,
                    decoration: InputDecoration(
                      labelText: 'Laptop IP / WebSocket Endpoint',
                      hintText: 'e.g. 10.0.2.2:4000 (emulator) or 192.168.x.x:4000',
                      prefixIcon: const Icon(Icons.laptop_mac),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: [
                      ActionChip(
                        label: const Text('Emulator (10.0.2.2:4000)', style: TextStyle(fontSize: 10)),
                        onPressed: () => _laptopHostController.text = '10.0.2.2:4000',
                      ),
                      ActionChip(
                        label: const Text('Localhost (4000)', style: TextStyle(fontSize: 10)),
                        onPressed: () => _laptopHostController.text = 'localhost:4000',
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Session Token
                  TextField(
                    controller: _sessionTokenController,
                    decoration: InputDecoration(
                      labelText: 'Exam Session Token',
                      hintText: 'e.g. CLIAS-24CS024 (from laptop)',
                      prefixIcon: const Icon(Icons.vpn_key),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Question Identifier
                  TextField(
                    controller: _questionIdController,
                    decoration: InputDecoration(
                      labelText: 'Question Identifier',
                      prefixIcon: const Icon(Icons.help_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Connect & Start Button
                  ElevatedButton(
                    onPressed: _launchExamSession,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock_outline, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Start Secure Exam Sheet',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
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
