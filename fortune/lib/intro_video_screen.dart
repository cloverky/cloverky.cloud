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

  /// How long initialization may take before we give up on the video.
  ///
  /// Measured at ~4.5s for a debug build on an API 34 emulator, so a tighter
  /// budget skips the clip on slow cold starts. Release builds on real hardware
  /// finish far inside this, which means the wait only ever materialises when
  /// playback is genuinely broken.
  static const Duration initTimeout = Duration(seconds: 10);

  /// Extra time the clip gets on top of its own duration before we cut it off.
  static const Duration playbackGrace = Duration(seconds: 2);

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
    _watchdogTimer = Timer(IntroVideoScreen.initTimeout, _goToLanding);

    final controller = VideoPlayerController.asset('assets/video/intro.mp4');
    _controller = controller;

    try {
      await controller.initialize();
      // _navigated matters as much as mounted here: the watchdog may have
      // already decided to leave while initialize() was still running, and
      // setting up playback afterwards touches a defunct State.
      if (!mounted || _navigated) return;

      // Re-arm against the real duration. Otherwise a slow initialization eats
      // into the clip's own budget and the watchdog cuts playback short.
      _watchdogTimer?.cancel();
      _watchdogTimer = Timer(
        controller.value.duration + IntroVideoScreen.playbackGrace,
        _goToLanding,
      );

      await controller.setVolume(0);
      if (!mounted || _navigated) return;

      controller.addListener(_onTick);
      setState(() {});
      await controller.play();
    } catch (error) {
      // Skipping is the right behaviour for the user, but it should not be
      // silent for us: a permanently broken intro looks exactly like a fast
      // startup. Reporting this through FlutterError would fail widget tests,
      // which exercise this path deliberately — this is a handled condition.
      debugPrint('Intro video failed to start, skipping to landing: $error');
      _goToLanding();
    }
  }

  void _onTick() {
    final value = _controller?.value;
    if (value == null || !value.isInitialized) return;
    // Ask the player whether it finished rather than comparing position against
    // duration: between initialize() and the first frame both read as zero, and
    // "position >= duration" is then true, which skips the clip instantly.
    if (value.isCompleted) {
      _goToLanding();
    }
  }

  void _goToLanding() {
    if (_navigated || !mounted) return;
    _navigated = true;
    _watchdogTimer?.cancel();

    // The listener and the watchdog can both fire mid-frame; defer so we never
    // push a route while the tree is building.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        // PageRouteBuilder already fades over 300ms by default.
        PageRouteBuilder<void>(
          pageBuilder: (_, _, _) => const LandingScreen(),
          transitionsBuilder: (_, animation, _, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    });

    // A screen showing a still frame schedules no frames of its own, so the
    // callback above would sit unclaimed until something else happened to
    // repaint. Ask for the frame that runs it.
    WidgetsBinding.instance.scheduleFrame();
  }

  @override
  void dispose() {
    // Cancelling matters beyond tidiness: a live timer makes widget tests fail
    // with "A Timer is still pending", which is hard to trace back.
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
