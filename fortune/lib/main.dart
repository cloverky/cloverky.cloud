import 'package:flutter/material.dart';

import 'intro_video_screen.dart';
import 'theme.dart';

void main() {
  runApp(const FridgeAIApp());
}

class FridgeAIApp extends StatelessWidget {
  const FridgeAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FridgeAI',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const IntroVideoScreen(),
    );
  }
}
