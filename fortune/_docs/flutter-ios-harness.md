# Flutter iOS 개발 하네스

> 아이폰 실제 기기 연동 절차. 기준일 **2026-07-31**.
> 버전은 §1이 유일한 소스이며, 갱신 시 §1을 먼저 고친다. 안드로이드는 [`flutter-android-harness.md`](./flutter-android-harness.md).

---

## 1. 버전 기준선

**iOS 빌드에는 macOS 가 반드시 필요하다.** Windows · Linux 에서는 코드 작성만 가능하고 빌드·서명·실기기 실행은 불가능하다.

| 항목 | 버전 | 비고 |
|------|------|------|
| Flutter (stable) | **3.44.7** / Dart **3.12.2** | `pubspec.yaml` → `sdk: ^3.12.2` |
| Xcode | **26.x 최신** | 검증 시점 stable: **26.5** (2026-05-11) |
| 최소 iOS 배포 타깃 | **iOS 13** | Flutter 3.44 기준 |
| 기기 개발자 모드 | **iOS 16 이상 필수** | §5 |
| 의존성 관리 | **Swift Package Manager** | Flutter 3.44부터 기본값 |

> **이 저장소 전제 2가지**
> 1. `fortune/` 에 **`ios/` 폴더가 없다.** `.metadata` 에 등록된 플랫폼은 android · web · windows 뿐이다 → §4에서 생성한다.
> 2. 현재 개발 환경은 **Windows + WSL2** 다. 이 문서를 실행하려면 macOS 기기가 따로 필요하다.

---

## 2. macOS · Xcode 설정

App Store 에서 Xcode 설치 후, 터미널에서 순서대로 실행한다.

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch     # 필수 컴포넌트 설치
sudo xcodebuild -license            # 라이선스 동의 (agree 입력)
xcodebuild -downloadPlatform iOS    # iOS 플랫폼 SDK 다운로드
```

```bash
flutter doctor -v
# 기대 출력: [✓] Xcode - develop for iOS and macOS (Xcode 26.x)
```

---

## 3. 의존성 — CocoaPods 는 더 이상 기본이 아니다

**Flutter 3.44부터 Swift Package Manager(SPM)가 CocoaPods 를 대체하는 기본값이다.**
`flutter run` 이 Xcode 프로젝트를 자동 마이그레이션하므로 **별도 설치 작업이 없다.**

| 옛 가이드 | 현재 |
|-----------|------|
| `sudo gem install cocoapods` | **불필요.** SPM 이 기본값 |
| Apple Silicon 용 `gem uninstall ffi && gem install ffi -- --enable-libffi-alloc` | **불필요.** 구형 Ruby 시절 우회책 |
| CocoaPods 없이는 플러그인 사용 불가 | SPM 미지원 플러그인만 CocoaPods 로 자동 폴백 |

SPM 을 지원하지 않는 플러그인이 있으면 Flutter 가 경고로 해당 목록을 출력하고 CocoaPods 로 폴백한다.
**이 경우에만** CocoaPods 를 설치한다. `sudo gem` 이 아니라 Homebrew 를 쓴다.

```bash
brew install cocoapods
```

> **CocoaPods 레지스트리는 2026-12-02 에 읽기 전용으로 전환된다.** 신규 코드는 SPM 지원 플러그인을 우선 선택한다.

---

## 4. iOS 프로젝트 생성 + 서명

`ios/` 폴더가 없으므로 먼저 생성한다.

```bash
cd fortune
flutter create --platforms=ios .   # 기존 lib/ · android/ 는 건드리지 않는다
```

Xcode 로 **`ios/Runner.xcworkspace`** 를 연다. (`.xcodeproj` 가 아니다 — SPM 환경에서도 workspace 를 쓴다.)

[Runner] → TARGETS **[Runner]** → **[Signing & Capabilities]** 탭에서:

| 항목 | 설정 |
|------|------|
| **Bundle Identifier** | 전 세계에서 고유한 역방향 도메인. 이 저장소라면 `cloud.cloverky.fortune` 형태 |
| **Automatically manage signing** | 체크 |
| **Team** | Apple 계정 선택 (없으면 [Add an Account] 로 로그인) |

> 무료 Apple ID 로도 실기기 실행이 되지만 **서명이 7일마다 만료**되고 앱 개수 제한이 있다.
> 배포·장기 테스트에는 유료 Apple Developer Program 이 필요하다.
>
> 안드로이드의 `applicationId` 는 현재 `com.example.fortune` 이다. 릴리스 전 iOS Bundle ID 와 함께 맞춘다.

---

## 5. 실제 기기 연결

### 케이블(USB) 연결

폰의 데이터 케이블을 Mac 에 직결한다. **충전 전용 케이블은 인식되지 않는다.**

1. 아이폰에 뜨는 **[이 컴퓨터를 신뢰하시겠습니까?]** → **[신뢰]** → 암호 입력
2. **개발자 모드 활성화 (iOS 16 이상 필수)**
   [설정] → [개인정보 보호 및 보안] → [개발자 모드] → 켜기 → **기기 재시동** → [켜기] 확인
3. 첫 실행 시 서명 신뢰
   [설정] → [일반] → [VPN 및 기기 관리] → [개발자 앱] → 본인 인증서 → **[신뢰]**

### 무선(Wi-Fi) 연결

Mac 과 아이폰이 같은 네트워크에 있어야 한다. 최초 1회는 케이블 연결이 필요하다.

Xcode → [Window] → **[Devices and Simulators]** → 기기 선택 → **[Connect via network]** 체크
→ 이후 케이블을 빼도 기기 목록에 남는다.

### 검증

```bash
flutter devices
# 기대 출력 예:
# soyeon의 iPhone (mobile) • 00008120-XXXXXXXXXXXX • ios • iOS 26.x

flutter run -d 00008120-XXXXXXXXXXXX
```

> **"iOS 14 이상에서는 Release 모드로 빌드하라"는 옛 안내는 따르지 않는다.**
> 2020년경 Xcode 버그의 우회책이고 이미 해결됐다. Release 모드로 실행하면 **hot reload 와 디버거가 죽는다.**
> 디버그 실행이 실패하면 개발자 모드(위 2번)와 인증서 신뢰(3번)부터 확인한다.

---

## 6. 체크리스트

"됐다"고 보고하기 전에 순서대로 통과시킨다.

```bash
flutter --version                # 검증: Flutter 3.44.x / Dart 3.12.x
flutter doctor -v                # 검증: [✓] Xcode 항목
flutter devices                  # 검증: 기기가 ios 로 표시
flutter run -d <device-id>       # 검증: 앱 실행 + hot reload(r) 동작

flutter analyze --fatal-infos    # 루트 CLAUDE.md 규정
dart format --set-exit-if-changed .
```

**린터 에러는 무시하지 않는다.** 수정 후 완료 보고한다.
