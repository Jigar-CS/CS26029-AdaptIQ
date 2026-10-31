import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/pairing_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Enforce edge-to-edge / portrait or flexible orientation
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(const CliasCompanionApp());
}

class CliasCompanionApp extends StatelessWidget {
  const CliasCompanionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AdaptIQ Answer Companion',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D9488),
          primary: const Color(0xFF0D9488),
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const PairingScreen(),
    );
  }
}
