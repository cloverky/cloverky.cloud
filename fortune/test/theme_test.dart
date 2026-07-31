import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/theme.dart';

void main() {
  test('본문 기본 폰트는 웹 프론트와 같은 Noto Sans KR이다', () {
    final theme = buildAppTheme();

    // 폰트를 번들만 하고 테마에 연결하지 않으면 기기 기본 폰트로 조용히
    // 되돌아간다. 화면상으로는 "웹과 좀 다르네" 정도로만 보여서 놓치기 쉽다.
    expect(theme.textTheme.bodyMedium?.fontFamily, kFontSans);
  });
}
