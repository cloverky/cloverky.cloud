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
    await tester.pump(
      IntroVideoScreen.initTimeout + const Duration(seconds: 1),
    );
    await tester.pumpAndSettle();

    expect(find.byType(LandingScreen), findsOneWidget);
    expect(find.byType(IntroVideoScreen), findsNothing);
  });
}
