# 인트로 영상 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 실행 시 4초짜리 인트로 영상을 음소거로 재생하고, 끝나면 페이드로 랜딩 화면에 넘긴다.

**Architecture:** `main.dart`는 앱 설정만 남기고, 색상 토큰은 `theme.dart`로, 기존 랜딩 UI는 `landing_screen.dart`로 분리한다. 새 `IntroVideoScreen`이 `video_player`로 에셋을 재생하고 완료·실패·타임아웃 어느 경우에도 `pushReplacement`로 랜딩에 한 번만 넘긴다.

**Tech Stack:** Flutter 3.44.8 / Dart 3.12.2, `video_player`, `flutter_test`

**설계 문서:** `fortune/docs/superpowers/specs/2026-07-31-intro-video-design.md`

## Global Constraints

- 작업 디렉터리는 WSL의 `~/projects/cloverky.cloud/fortune`. 모든 `flutter` 명령은 여기서 실행한다.
- git 저장소 루트는 **상위** `~/projects/cloverky.cloud`. `fortune`은 그 하위 디렉터리이므로 커밋 경로는 `fortune/`으로 시작한다.
- 색상 **값**은 절대 바꾸지 않는다. 이름만 비공개(`_bg`)에서 공개(`kBg`)로 바꾼다.
- 원칙: 어떤 경우에도 사용자가 인트로 화면에 갇히지 않는다. 재생 실패·초기화 지연·재생 정지 전부 랜딩으로 빠져나가야 한다.
- 화면 전환은 단 한 번만 일어난다.
- 에뮬레이터 `emulator-5554`가 떠 있어야 `flutter run` 확인이 가능하다.
- 기존 `test/widget_test.dart`는 계속 통과해야 한다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `lib/theme.dart` (신규) | 색상 토큰만. 위젯 없음. |
| `lib/landing_screen.dart` (신규) | `LandingScreen`과 그 전용 하위 위젯. 기존 UI 그대로. |
| `lib/intro_video_screen.dart` (신규) | `IntroVideoScreen` 하나. 재생과 전환 책임만. |
| `lib/main.dart` (수정) | `main()`, `FridgeAIApp`, 테마 설정만 남김. |
| `pubspec.yaml` (수정) | `video_player` 의존성, 에셋 등록. |
| `assets/video/intro.mp4` (이름 변경) | 인트로 영상. |
| `test/intro_video_screen_test.dart` (신규) | 실패 시 랜딩 전환 검증. |
| `test/widget_test.dart` (수정) | 타이머 정리를 위해 pump 보강. |

---

## Task 1: 에셋 정리와 의존성 추가

영상 파일명의 `…`(U+2026)를 없애고, `video_player`와 에셋 등록을 끝내 이후 태스크가 코드에 집중할 수 있게 한다.

**Files:**
- Rename: `assets/video/Refrigerator_opens_revealing_gro…_202607310943.mp4` → `assets/video/intro.mp4`
- Modify: `pubspec.yaml`

**Interfaces:**
- Consumes: 없음
- Produces: 에셋 경로 문자열 `'assets/video/intro.mp4'` (Task 3에서 사용), `package:video_player/video_player.dart` 사용 가능

- [ ] **Step 1: 영상 파일 이름 변경**

파일명에 특수문자가 있어 글롭으로 처리한다.

```bash
cd ~/projects/cloverky.cloud/fortune
mv assets/video/*.mp4 assets/video/intro.mp4
ls -la assets/video/
```

기대: `intro.mp4` 하나만 있고 크기가 983525 바이트.

- [ ] **Step 2: video_player 의존성 추가**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter pub add video_player
```

기대: `pubspec.yaml`의 `dependencies`에 `video_player`가 추가되고 `flutter pub get`이 성공한다.

- [ ] **Step 3: pubspec에 에셋 등록**

`pubspec.yaml`의 `flutter:` 섹션에서 `uses-material-design: true` 바로 아래에 다음을 넣는다. 그 아래 주석 처리된 `# assets:` 예시 블록은 그대로 둬도 된다.

```yaml
flutter:
  uses-material-design: true

  assets:
    - assets/video/intro.mp4
```

- [ ] **Step 4: 에셋이 실제로 묶이는지 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter pub get
flutter test
```

기대: `flutter pub get` 성공, 기존 스모크 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add fortune/assets/video/intro.mp4 fortune/pubspec.yaml fortune/pubspec.lock
git rm --cached "fortune/assets/video/Refrigerator_opens_revealing_gro…_202607310943.mp4" 2>/dev/null || true
git commit -m "chore(fortune): rename intro video asset and add video_player"
```

---

## Task 2: 색상 토큰과 랜딩 화면 분리

동작 변화가 전혀 없는 순수 리팩터링이다. 이 태스크가 끝나도 앱 화면은 지금과 완전히 같아야 한다.

**Files:**
- Create: `lib/theme.dart`
- Create: `lib/landing_screen.dart`
- Modify: `lib/main.dart`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `lib/theme.dart`: `const Color kBg, kTopMint, kAccent, kBrandText, kFg, kMutedFg, kBorder, kButtonBg`
  - `lib/landing_screen.dart`: `class LandingScreen extends StatelessWidget` — 생성자 `const LandingScreen({super.key})`

- [ ] **Step 1: `lib/theme.dart` 생성**

값은 현재 `main.dart` 7~15행과 동일하다. 이름만 공개로 바꾼다.

```dart
import 'package:flutter/material.dart';

/// Light mode design tokens shared by every screen.
///
/// These were private to main.dart; they are public here because both the
/// app theme and the landing screen need them.
const Color kBg = Color(0xFFFFFFFF);
const Color kTopMint = Color(0xFFCFE9D8);
const Color kAccent = Color(0xFF4DB87E);
const Color kBrandText = Color(0xFF2E8B57);
const Color kFg = Color(0xFF171717);
const Color kMutedFg = Color(0xFF6B7280);
const Color kBorder = Color(0xFFE5E7EB);
const Color kButtonBg = Color(0xFF171717);
```

- [ ] **Step 2: `lib/landing_screen.dart` 생성**

`lib/main.dart`의 **42행부터 412행까지**(`class IntroScreen`부터 파일 끝 `_ChefHatPainter`까지)를 잘라내 새 파일로 옮긴다. 파일 맨 위에 다음 import를 넣는다.

```dart
import 'package:flutter/material.dart';

import 'theme.dart';
```

옮기면서 아래 치환을 전부 적용한다. 값은 건드리지 않는다.

| 기존 | 변경 |
|---|---|
| `IntroScreen` | `LandingScreen` |
| `_bg` | `kBg` |
| `_topMint` | `kTopMint` |
| `_accent` | `kAccent` |
| `_brandText` | `kBrandText` |
| `_fg` | `kFg` |
| `_mutedFg` | `kMutedFg` |
| `_border` | `kBorder` |
| `_buttonBg` | `kButtonBg` |

`_BadgePill`, `_HeroTitle`, `_Description`, `_CtaRow`, `_ChefHatIcon`, `_ChefHatPainter`는 이름을 바꾸지 않고 이 파일 안에 그대로 둔다. 이들은 랜딩 화면 전용이다.

- [ ] **Step 3: `lib/main.dart`를 아래 내용으로 교체**

이 시점에는 `IntroVideoScreen`이 아직 없으므로 `home`은 `LandingScreen`으로 둔다. Task 3에서 바꾼다.

```dart
import 'package:flutter/material.dart';

import 'landing_screen.dart';
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
      home: const LandingScreen(),
    );
  }
}
```

- [ ] **Step 4: 정적 분석과 테스트 통과 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
dart format lib test
flutter analyze
flutter test
```

기대: `flutter analyze`가 이슈 0건, 기존 스모크 테스트 통과.
`_bg` 같은 이름이 하나라도 남아 있으면 여기서 "Undefined name" 오류로 잡힌다.

- [ ] **Step 5: 화면이 그대로인지 눈으로 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter run
```

기대: 에뮬레이터에 지금과 **똑같은** FridgeAI 랜딩 화면. 색·간격·문구 어느 것도 달라지면 안 된다. 확인 후 `q`로 종료.

- [ ] **Step 6: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add fortune/lib/theme.dart fortune/lib/landing_screen.dart fortune/lib/main.dart
git commit -m "refactor(fortune): extract theme tokens and landing screen from main.dart"
```

---

## Task 3: 인트로 영상 화면 구현

**Files:**
- Create: `lib/intro_video_screen.dart`
- Create: `test/intro_video_screen_test.dart`
- Modify: `lib/main.dart` (`home`만)
- Modify: `test/widget_test.dart`

**Interfaces:**
- Consumes: `kBg` (`theme.dart`), `LandingScreen` (`landing_screen.dart`), 에셋 `'assets/video/intro.mp4'`
- Produces: `class IntroVideoScreen extends StatefulWidget` — 생성자 `const IntroVideoScreen({super.key})`, 정적 상수 `static const Duration watchdog = Duration(seconds: 6)`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/intro_video_screen_test.dart`를 새로 만든다.

테스트 환경에는 `video_player` 플랫폼 구현이 없어 초기화가 항상 실패한다. 그래서 실패 경로가 자동으로 검증된다 — 그리고 그 경로가 이 화면에서 가장 중요한 경로다.

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/intro_video_screen.dart';
import 'package:fortune/landing_screen.dart';

void main() {
  testWidgets('영상을 재생할 수 없으면 랜딩 화면으로 넘어간다', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: IntroVideoScreen()));

    // 테스트 환경에는 video_player 플랫폼 구현이 없다. 초기화가 즉시
    // 실패하거나, 실패조차 하지 않고 멈춰 있을 수 있다. 두 경우 모두
    // 랜딩으로 빠져나와야 하므로 워치독 시간보다 길게 진행시킨다.
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 7));
    await tester.pumpAndSettle();

    expect(find.byType(LandingScreen), findsOneWidget);
    expect(find.byType(IntroVideoScreen), findsNothing);
  });
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter test test/intro_video_screen_test.dart
```

기대: FAIL. `package:fortune/intro_video_screen.dart` 를 찾을 수 없다는 컴파일 오류.

- [ ] **Step 3: `lib/intro_video_screen.dart` 구현**

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'landing_screen.dart';
import 'theme.dart';

/// Plays a short intro video, then hands off to [LandingScreen].
///
/// The handoff must happen even when playback never works, so the user is
/// never stranded on the intro: initialization errors go straight to the
/// landing screen, and a watchdog timer — armed before initialization, not
/// after — forces the transition if anything stalls.
class IntroVideoScreen extends StatefulWidget {
  const IntroVideoScreen({super.key});

  /// The clip runs ~4s; the headroom covers slow first-frame decode.
  static const Duration watchdog = Duration(seconds: 6);

  @override
  State<IntroVideoScreen> createState() => _IntroVideoScreenState();
}

class _IntroVideoScreenState extends State<IntroVideoScreen> {
  VideoPlayerController? _controller;
  Timer? _watchdogTimer;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    // Armed first: initialization itself can hang, not just playback.
    _watchdogTimer = Timer(IntroVideoScreen.watchdog, _goToLanding);

    final controller = VideoPlayerController.asset('assets/video/intro.mp4');
    _controller = controller;

    try {
      await controller.initialize();
      if (!mounted) return;
      await controller.setVolume(0);
      controller.addListener(_onTick);
      setState(() {});
      await controller.play();
    } catch (_) {
      _goToLanding();
    }
  }

  void _onTick() {
    final value = _controller?.value;
    if (value == null || !value.isInitialized) return;
    if (value.position >= value.duration && !value.isPlaying) {
      _goToLanding();
    }
  }

  void _goToLanding() {
    if (_navigated || !mounted) return;
    _navigated = true;
    _watchdogTimer?.cancel();

    // The listener and the watchdog can both fire mid-frame; defer so we
    // never push a route while the tree is building.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder<void>(
          transitionDuration: const Duration(milliseconds: 300),
          pageBuilder: (_, _, _) => const LandingScreen(),
          transitionsBuilder: (_, animation, _, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    });
  }

  @override
  void dispose() {
    // Cancelling matters beyond tidiness: a live timer makes widget tests
    // fail with "A Timer is still pending", which is hard to trace back.
    _watchdogTimer?.cancel();
    _controller?.removeListener(_onTick);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final ready = controller != null && controller.value.isInitialized;

    return Scaffold(
      backgroundColor: kBg,
      body: ready
          ? SizedBox.expand(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: controller.value.size.width,
                  height: controller.value.size.height,
                  child: VideoPlayer(controller),
                ),
              ),
            )
          // No spinner: at 4 seconds it would only flicker.
          : const SizedBox.expand(),
    );
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter test test/intro_video_screen_test.dart
```

기대: PASS. 실패하면 "A Timer is still pending"이 아닌지 먼저 본다 — 그렇다면 `dispose`의 타이머 취소가 빠진 것이다.

- [ ] **Step 5: `main.dart`의 home을 인트로로 교체**

`lib/main.dart`에서 import와 `home` 두 줄만 바꾼다.

```dart
import 'intro_video_screen.dart';
```

```dart
      home: const IntroVideoScreen(),
```

`landing_screen.dart` import는 더 이상 `main.dart`에서 쓰지 않으므로 지운다. `theme.dart` import는 테마가 계속 쓰므로 남긴다.

- [ ] **Step 6: 기존 스모크 테스트 보강**

`test/widget_test.dart`의 테스트 본문을 아래로 바꾼다. `home`이 이제 타이머를 거는 화면이라 pump 없이 끝내면 타이머가 남아 실패할 수 있다.

```dart
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FridgeAIApp());
    expect(find.byType(MaterialApp), findsOneWidget);

    // home은 이제 타이머를 거는 인트로 화면이다. 정리될 때까지 진행시킨다.
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 7));
    await tester.pumpAndSettle();
  });
```

- [ ] **Step 7: 전체 검사**

```bash
cd ~/projects/cloverky.cloud/fortune
dart format lib test
flutter analyze
flutter test
```

기대: analyze 이슈 0건, 테스트 2개 모두 통과.

- [ ] **Step 8: 실제 기기에서 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter run
```

기대: 에뮬레이터에서 인트로 영상이 **소리 없이** 재생되고, 약 4초 뒤 페이드로 FridgeAI 랜딩 화면으로 넘어간다. 영상이 화면을 여백 없이 채운다. 확인 후 `q`.

- [ ] **Step 9: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add fortune/lib/intro_video_screen.dart fortune/lib/main.dart \
        fortune/test/intro_video_screen_test.dart fortune/test/widget_test.dart
git commit -m "feat(fortune): play intro video before landing screen"
```

---

## 완료 기준

- 앱을 실행하면 인트로 영상이 음소거로 재생되고 끝나면 자동으로 랜딩 화면이 나온다.
- 영상 재생이 실패해도 앱을 정상적으로 쓸 수 있다.
- `flutter analyze` 이슈 0건, `flutter test` 전부 통과.
- 랜딩 화면 디자인은 작업 전과 동일하다.
