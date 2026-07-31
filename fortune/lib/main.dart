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
      theme: ThemeData(
        scaffoldBackgroundColor: kBg,
        colorScheme: const ColorScheme.light(
          primary: kAccent,
          secondary: kBrandText,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      ),
      home: const IntroVideoScreen(),
    );
  }
}
