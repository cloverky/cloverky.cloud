# 인트로 영상 화면 설계

작성일: 2026-07-31

## 배경

앱을 실행하면 곧바로 FridgeAI 랜딩 화면이 뜬다. 여기에 4초짜리 냉장고 인트로 영상을 앞에 붙여, 영상이 끝나면 자동으로 랜딩 화면으로 넘어가게 한다.

소재: `assets/video/Refrigerator_opens_revealing_gro…_202607310943.mp4` (983,525 바이트, 4초)

## 목표와 비목표

**목표**

- 앱 실행 시 인트로 영상이 자동 재생되고, 끝나면 랜딩 화면으로 자동 전환된다.
- 영상 재생에 어떤 문제가 생겨도 사용자가 앱을 정상적으로 쓸 수 있다.

**비목표 (이번 범위 아님)**

- Flutter 엔진 부팅 전 흰 화면 제거 (네이티브 스플래시). 별도 작업으로 남긴다.
- 인트로 건너뛰기 버튼.
- 첫 실행에만 보여주는 온보딩 동작. 매 실행마다 재생한다.
- `applicationId`를 `com.example.fortune`에서 바꾸는 일.

## 확정된 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 재생 범위 | 매 실행마다 | 4초로 짧아 부담이 적고, 저장소 의존성이 필요 없다 |
| 종료 동작 | 자동 전환 | 사용자 조작 없이 넘어가는 표준 스플래시 패턴 |
| 화면 구성 | 별도 화면 + 페이드 라우트 | 두 화면이 독립적이라 이후 화면 추가가 쉽다 |
| 소리 | 음소거 | 실행 직후 예고 없이 소리가 나는 것을 피한다 |
| 채움 방식 | `BoxFit.cover` | 기기 비율과 무관하게 여백 없이 채운다 |
| 로딩 표시 | 없음 | 4초짜리에 스피너는 깜빡임만 만든다 |

## 파일 변경

**에셋**

- `assets/video/Refrigerator_opens_revealing_gro…_202607310943.mp4` → `assets/video/intro.mp4`로 이름 변경.
  현재 파일명에 U+2026(`…`) 문자가 들어 있다. pubspec의 에셋 경로, Gradle 패키징, 다른 OS나 CI로 옮겼을 때 이 문자가 깨지면 "에셋을 찾을 수 없다"는 형태로만 드러나 원인 추적이 어렵다.

**`pubspec.yaml`**

- `dependencies`에 `video_player` 추가 (`flutter pub add video_player`가 결정하는 버전을 따른다).
- 현재 전부 주석 처리된 `flutter.assets` 섹션을 살려 `assets/video/intro.mp4`를 등록한다.

**`lib/theme.dart` (신규)**

- 색상 토큰을 여기로 모으고 **공개 이름**으로 바꾼다: `kBg`, `kTopMint`, `kAccent`, `kBrandText`, `kFg`, `kMutedFg`, `kBorder`, `kButtonBg`.
- 현재 토큰들은 `_bg`처럼 밑줄로 시작해 파일 바깥에서 참조할 수 없다. `main.dart`의 `ThemeData`와 `landing_screen.dart`가 **둘 다** 이 값을 쓰므로, 한쪽 파일로 옮기면 다른 쪽이 컴파일되지 않는다. 값 자체는 바꾸지 않고 이름만 공개로 바꾼다.

**`lib/main.dart`**

- 랜딩 화면 UI 전체(`IntroScreen`과 그 하위 비공개 위젯들)를 `lib/landing_screen.dart`로 옮긴다.
- 색상 토큰은 `lib/theme.dart`로 옮기고 여기서는 import해서 쓴다.
- 남는 것은 `main()`, `FridgeAIApp`, 테마 설정뿐이다.
- `home`을 `const IntroVideoScreen()`으로 바꾼다.

**`lib/landing_screen.dart` (신규)**

- 기존 `IntroScreen`을 `LandingScreen`으로 개명해 이사한다. 현재 이름이 실제 역할(랜딩 페이지)과 어긋나 새 인트로 화면과 혼동된다.
- 색상은 `theme.dart`에서 import한다. 하위 비공개 위젯(`_BadgePill`, `_HeroTitle`, `_Description`, `_CtaRow`, `_ChefHatIcon`, `_ChefHatPainter`)은 이 파일 안에 그대로 둔다.
- UI 내용은 그대로 둔다. 이번 작업에서 디자인 변경은 없다.

**`lib/intro_video_screen.dart` (신규)**

- `IntroVideoScreen` (StatefulWidget) 하나만 둔다.

## 동작 흐름

1. `FridgeAIApp`의 `home`이 `IntroVideoScreen`을 띄운다.
2. `initState`에서 `VideoPlayerController.asset('assets/video/intro.mp4')`를 만들고 `initialize()`를 호출한다.
3. 초기화 성공 시 `setVolume(0)` 후 `play()`. 동시에 6초 타임아웃 타이머를 건다.
4. 컨트롤러 리스너가 재생 완료를 감지하면 랜딩으로 전환한다.
5. 전환은 `Navigator.pushReplacement`에 300ms 페이드를 입힌 `PageRouteBuilder`를 쓴다. 인트로는 뒤로가기로 돌아올 대상이 아니므로 스택에서 교체한다.

재생 완료 판정은 `value.position >= value.duration && !value.isPlaying`으로 한다. `isCompleted`는 `video_player` 2.9 이상에서만 제공되는데 해석될 버전을 미리 확정할 수 없어, 모든 버전에서 동작하는 쪽을 쓴다. 전환 호출은 `_goToLanding()` 한 곳으로 모은다.

## 에러 처리와 안전장치

원칙: **어떤 경우에도 사용자가 인트로 화면에 갇히지 않는다.** 영상은 부가 요소이고, 그것 때문에 앱을 못 쓰게 되어서는 안 된다.

- `initialize()`가 실패하면 예외를 잡아 즉시 `_goToLanding()`을 호출한다.
- 워치독은 두 단계다. `initialize()`를 호출하기 **전에** **10초** 타이머를 건다(초기화 자체가 응답 없이 멈추는 경우를 덮기 위해). 초기화가 성공하면 그 타이머를 취소하고 **영상 길이 + 2초**로 다시 건다. 한 번만 걸면 느린 초기화가 재생 시간을 잡아먹어 클립이 잘린다.
- 초기화 시간은 API 34 에뮬레이터 디버그 빌드에서 약 4.5초로 측정됐다. 10초는 그 실측값에 대한 여유이며, 실기기 릴리즈 빌드에서는 훨씬 빨라 이 대기가 드러나지 않는다.
- 재생 완료 판정은 `VideoPlayerValue.isCompleted`를 쓴다. `position >= duration` 비교는 초기화 직후 둘 다 0이라 참이 되어 클립을 즉시 건너뛴다.
- `_navigated` 불리언 플래그로 전환을 단 한 번만 수행한다. 완료 신호와 타임아웃이 같은 프레임에 겹쳐도 `pushReplacement`가 두 번 호출되지 않는다.
- `dispose()`에서 **타임아웃 타이머를 반드시 취소**하고, 리스너를 제거한 뒤 컨트롤러를 정리한다.
  타이머를 취소하지 않으면 위젯 테스트가 "타이머가 아직 살아 있다"며 실패하는데, 이 실패는 원인이 드러나지 않아 추적이 오래 걸린다.
- 비동기 작업 완료 후 `setState`나 `Navigator`를 쓰기 전에 `mounted`를 확인한다.

## 화면 표현

- 배경은 흰색(`#FFFFFF`). 랜딩 화면의 기본 배경과 같아 전환 시 이질감이 없다.
- 영상은 `BoxFit.cover`로 화면을 채운다. 기기 비율과 영상 비율이 달라도 여백이 생기지 않는다.
- 초기화 완료 전에는 흰 배경만 보인다.

## 테스트

`video_player`는 플랫폼 채널을 쓰므로 위젯 테스트 환경에서는 초기화가 **항상 실패한다.** 따라서 실패 경로가 테스트하기 가장 쉬우면서 동시에 가장 중요한 경로다.

- 기존 `test/widget_test.dart`의 스모크 테스트(`FridgeAIApp`을 띄워 `MaterialApp` 확인)는 그대로 통과해야 한다. 초기화 실패를 잡아 랜딩으로 넘기므로 예외가 새어 나가지 않는다.
- 추가 테스트: 영상 초기화가 실패하는 기본 환경에서 `LandingScreen`으로 전환되는지 확인한다.
- 타이머가 정리되는지는 테스트가 통과하는 것 자체로 검증된다. 남아 있으면 테스트가 실패한다.

## 후속 과제 (이번 범위 밖)

- `applicationId`가 `com.example.fortune`으로 남아 있어 `namespace`(`cloud.cloverky.fortune`)와 다르다. 스토어 배포 전 정리 필요.
- `lib/counter.dart`와 `android/.../CounterActivity.kt`가 0바이트 빈 파일이다.
- 이 프로젝트의 사본이 WSL(`~/projects/cloverky.cloud/fortune`)과 Windows(`C:\Users\YoSeo\Documents\projects\cloverky.cloud\fortune`)에 서로 다른 상태로 존재한다. 어느 쪽이 정본인지 정리 필요.
