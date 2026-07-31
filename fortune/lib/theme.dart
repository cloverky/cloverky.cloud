import 'package:flutter/material.dart';

/// Light mode design tokens shared by every screen.
///
/// These were private to main.dart; they are public here because both the app
/// theme and the landing screen need them.
const Color kBg = Color(0xFFFFFFFF);
const Color kTopMint = Color(0xFFCFE9D8);
const Color kAccent = Color(0xFF4DB87E);
const Color kBrandText = Color(0xFF2E8B57);
const Color kFg = Color(0xFF171717);
const Color kMutedFg = Color(0xFF6B7280);
const Color kBorder = Color(0xFFE5E7EB);
const Color kButtonBg = Color(0xFF171717);

/// Body font. Matches the web frontend's `--font-sans`.
const String kFontSans = 'NotoSansKR';

/// Headline font. Matches the web frontend's `--font-display`.
///
/// Jua ships a single weight and is already heavy and rounded by design. Asking
/// for a bold weight makes the engine synthesise one, which thickens the
/// strokes and does not look like the site.
const String kFontDisplay = 'Jua';

/// The app's theme, built here rather than inline in main() so it can be
/// asserted on without pumping the whole widget tree.
ThemeData buildAppTheme() {
  return ThemeData(
    fontFamily: kFontSans,
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
  );
}
