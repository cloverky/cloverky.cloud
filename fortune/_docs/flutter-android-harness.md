# Flutter 안드로이드 개발 하네스

> 안드로이드 실제 기기 연동 절차. 기준일 **2026-07-31**.
> 버전은 §1이 유일한 소스이며, 갱신 시 §1을 먼저 고친다.

---

## 1. 버전 기준선

| 항목 | 버전 | 출처 |
|------|------|------|
| Flutter (stable) | **3.44.7** / Dart **3.12.2** | `pubspec.yaml` → `sdk: ^3.12.2` |
| Android Gradle Plugin | **9.0.1** | `android/settings.gradle.kts` |
| Gradle | **9.1.0** | `gradle-wrapper.properties` |
| Kotlin Gradle Plugin | **2.3.20** | `android/settings.gradle.kts` |
| JDK | **17** | `android/app/build.gradle.kts` |
| Android Studio | **Quail 2 Patch 1 (2026.1.2.11)** | AGP 7.1~9.3 지원 |

`android/app/build.gradle.kts` 는 SDK 레벨을 숫자로 박지 않고 `flutter.*` 를 참조한다.
**Flutter SDK 버전이 곧 SDK 레벨의 소스다.** Flutter 3.44 기준 실제 값:

| 값 | 레벨 | 의미 |
|----|------|------|
| `compileSdk` / `targetSdk` | **36** | Android 16 |
| `minSdk` | **24** | Android 7.0 미만 기기는 설치 불가 |
| `ndkVersion` | **28.2.13676358** | 이 버전을 정확히 설치 |

제약 체인 — 하나라도 어기면 빌드 실패: `AGP 9.0.1` → Gradle 9.1.0 이상, JDK 17 이상.

> Google Play 는 2026-08-31 부터 `targetSdk 36` 이상만 접수한다. Flutter 3.44 를 쓰는 한 이미 충족한다.

---

## 2. SDK 구성

[Tools] → [SDK Manager]. **SDK Platforms** 탭에서 `Android API 36` 체크 후, **SDK Tools** 탭에서:

| 패키지 | 비고 |
|--------|------|
| Android SDK Platform-Tools | `adb` 본체 |
| Android SDK Build-Tools | 최신 |
| Android SDK Command-line Tools | 라이선스 수락에 필수. **빠뜨리기 쉬움** |
| NDK (Side by side) | **28.2.13676358** — `Show Package Details` 를 켜야 버전 선택 가능 |
| CMake | NDK 동반 |
| Google USB Driver | **Windows + Pixel 계열일 때만** (삼성 등은 제조사 OEM 드라이버) |

```bash
flutter doctor --android-licenses
# 기대 출력: All SDK package licenses accepted.
```

---

## 3. 개발자 옵션 — 케이블 / 무선 공통

**빌드 번호 7번 탭** → "개발자가 되었습니다" 토스트 확인 → **개발자 옵션** 진입.

| 기기 | 빌드 번호 경로 | 개발자 옵션 경로 |
|------|----------------|------------------|
| Android 12~16 | [설정] → [휴대전화 정보] → [빌드 번호] | [설정] → [시스템] → [개발자 옵션] |
| 삼성 One UI | [설정] → [휴대전화 정보] → [소프트웨어 정보] → [빌드 번호] | [설정] 최하단 → [개발자 옵션] |
| Android 9~11 | [설정] → [시스템] → [휴대전화 정보] → [빌드 번호] | [설정] → [시스템] → [고급] → [개발자 옵션] |

**USB 디버깅**(케이블용)과 **무선 디버깅**(Wi-Fi용, Android 11+) 스위치를 켠다.

---

## 4. 케이블(USB)로 연결

폰의 데이터 케이블을 개발 PC 에 직결한다.

1. **충전 전용 케이블은 인식되지 않는다.** 데이터 전송 지원 케이블을 쓰고, 허브를 거치지 않는다.
2. 폰에 뜨는 **"USB 디버깅을 허용하시겠습니까?"** → [이 컴퓨터에서 항상 허용] 체크 후 [허용].
   대화상자가 안 뜨면 알림창의 USB 모드를 **[파일 전송 / MTP]** 로 바꾼다.

```bash
adb devices
# 기대 출력:
# List of devices attached
# R3CN90XXXXXX    device
```

| 출력 | 조치 |
|------|------|
| `device` | 정상 |
| `unauthorized` | [개발자 옵션] → [USB 디버깅 승인 취소] 후 재연결 |
| `offline` | `adb kill-server && adb start-server` |
| 비어 있음 | 케이블 · 드라이버 확인 |

> **WSL2 주의**: 이 저장소는 WSL2 안에 있고 SDK 는 Windows 쪽에 있다. **WSL2 는 USB 장치를 보지 못하므로
> 케이블을 꽂아도 WSL 의 `adb` 에는 잡히지 않는다.** Windows 에서 `flutter run` 을 실행하거나,
> `usbipd-win` 으로 어태치하거나, §5 무선 연결을 쓴다. 무선은 TCP 라서 WSL2 에서 그대로 동작한다.

---

## 5. 무선(Wi-Fi)으로 연결

**Android 11 (API 30) 이상, PC 와 폰이 같은 네트워크.** 케이블이 전혀 필요 없다.

[개발자 옵션] → [무선 디버깅] → **[페어링 코드로 기기 페어링]** → 표시된 화면을 켜 둔 채로:

```bash
adb pair 192.168.0.12:37451     # 팝업의 페어링 포트 + 6자리 코드
# 기대 출력: Successfully paired to ...

adb connect 192.168.0.12:41233  # [무선 디버깅] 메인 화면의 연결 포트
# 기대 출력: connected to ...
```

> **포트가 두 개다.** 페어링 포트는 1회용이고 매번 바뀐다. 연결 포트는 [무선 디버깅] 화면 상단에 따로 표시된다.
> 이 둘을 혼동하는 게 가장 흔한 실패다.

폰 재부팅·Wi-Fi 재접속 시 연결 포트만 바뀐다. 페어링은 유지되므로 `adb connect` 만 다시 하면 된다.
Android Studio 를 쓴다면 [Device Manager] → [Physical] → **[Pair using Wi-Fi]** 의 QR 스캔도 가능하다.

---

## 6. 체크리스트

"됐다"고 보고하기 전에 순서대로 통과시킨다.

```bash
flutter --version                # 검증: Flutter 3.44.x / Dart 3.12.x
flutter doctor -v                # 검증: Android toolchain 항목이 [✓]
adb devices                      # 검증: 시리얼 옆이 device
flutter devices                  # 검증: 대상 기기가 android-arm64 로 표시
flutter run -d <device-id>       # 검증: 앱 실행 + hot reload(r) 동작

flutter analyze --fatal-infos    # 루트 CLAUDE.md 규정
dart format --set-exit-if-changed .
```

**린터 에러는 무시하지 않는다.** 수정 후 완료 보고한다.
