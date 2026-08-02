# 위치 기반 날씨 — 설계

작성일: 2026-08-01 · 브랜치: `soyeon`

세 영역(`clover` 백엔드 · `lucky` 웹 · `fortune` 앱)에 걸치므로 문서 배치 규칙에 따라 루트 `_docs/`에 둔다.

## 배경

지금 날씨는 세 곳의 상태가 서로 다르다.

| 영역 | 현재 |
|---|---|
| 백엔드 | `GET /weather?city=&country=` — 도시 **이름**만 받는다. Open-Meteo 폴백 경로는 `SEOUL_LAT/SEOUL_LON` 상수로 **서울에 고정**돼 있어 도시를 바꿔 보내도 무시된다. |
| 웹 | `fetchWeather("Seoul", "KR")` 호출 — 기온은 실제 데이터지만 **도시는 서울 고정**. `navigator.geolocation` 사용처가 없다. |
| 앱 | `Text('18°  맑음 · 서울')` — API를 부르지 않는 **하드코딩 문자열**. 값은 웹 폴백 상수를 그대로 베낀 것이다. |

즉 "내 위치 날씨"는 앱이 웹보다 뒤처진 기능이 아니라, **세 곳 모두에 없는 기능**이다.

## 목표

사용자가 날씨 위젯을 탭하면 현재 위치의 날씨를 한글 지명과 함께 보여준다. 웹과 앱 모두 동일하게 동작한다.

## 확정 결정

| 항목 | 결정 |
|---|---|
| 권한 요청 시점 | **위젯을 탭했을 때.** 화면 진입 시 자동 요청하지 않는다. |
| 권한 거부·위치 실패 | **서울 날씨로 폴백.** 위젯을 숨기거나 재요청 버튼을 띄우지 않는다. |
| 지명 표시 | **한글.** OpenWeather 역지오코딩의 `local_names.ko`를 쓴다. |
| API 키 위치 | **서버에만.** 클라이언트가 OpenWeather를 직접 부르지 않는다. |
| 응답 스키마 | **변경하지 않는다.** `city` 필드에 한글 지명이 담기는 것만 달라진다. |
| 위치 정밀도 | **coarse(대략적 위치)**. 날씨에는 충분하고 권한 부담이 작다. |

## API 계약

```
GET /weather?lat=37.51&lon=126.78     ← 신규
GET /weather?city=Seoul&country=KR    ← 기존, 유지
GET /weather                          ← 기존, 유지 (설정된 기본 도시)
```

- `lat`/`lon`은 **둘 다** 있어야 한다. 하나만 오면 **422**를 반환한다. 조용히 무시하면 사용자는 위치가 반영된 줄 알고 서울 날씨를 보게 된다.
- 범위 검증은 FastAPI `Query(ge=..., le=...)`로 한다 (`lat` −90~90, `lon` −180~180).
- 응답은 기존 `WeatherResponse` 그대로: `city`, `country`, `temp_c`, `feels_like_c`, `description`, `icon`, `humidity`.
- 실패해도 **항상 200**을 반환하는 현재 성질을 유지한다. 날씨는 부가 정보이고, 클라이언트가 에러 분기를 갖지 않아도 되게 한다.

## 백엔드 — 새 스포크 `weather`

### 왜 구조를 바꾸는가

현재 `clover/apps/weather_provider.py` 한 파일에 ① 폴백 순서 결정 ② HTTP 클라이언트 두 개 ③ WMO 코드→한글 변환이 섞여 있다. 그래서 **폴백 로직만 따로 테스트할 수 없다** — 순서를 검증하려면 실제 네트워크가 필요하다.

인터랙터가 "어떤 순서로 시도할지"만 알고 게이트웨이가 "어떻게 부를지"만 알면, 가짜 게이트웨이를 주입해 네트워크 없이 폴백 순서를 검증할 수 있다. 좌표 지원으로 경로가 하나 더 늘어나는 지금이 나누기 좋은 시점이다.

### 폴더

```
clover/apps/weather/
├── app/
│   ├── dtos/weather_dto.py                 WeatherQuery, WeatherResult
│   ├── ports/
│   │   ├── input/weather_use_case.py       WeatherUseCase (ABC)
│   │   └── output/
│   │       ├── weather_gateway.py          WeatherGateway (ABC), WeatherUnavailableError
│   │       └── place_name_gateway.py       PlaceNameGateway (ABC)
│   └── use_cases/weather_interactor.py     WeatherInteractor
├── adapter/
│   ├── inbound/api/
│   │   ├── schemas/weather_schema.py       WeatherResponse, to_weather_response
│   │   └── v1/weather_router.py            weather_router
│   └── outbound/
│       ├── openweather/openweather_gateway.py   WeatherGateway + PlaceNameGateway 구현
│       └── openmeteo/openmeteo_gateway.py       WeatherGateway 구현
├── dependencies/weather.py                 get_weather_use_case
└── tests/
    ├── app/test_weather_interactor.py
    └── adapter/test_weather_router.py
```

`domain/` 폴더는 만들지 않는다 (`clover/CLAUDE.md` 기본 규칙). WMO 코드 매핑처럼 순수한 보조 로직은 그것을 쓰는 어댑터 옆 `_wmo.py`에 둔다.

`__init__.py`는 전부 0바이트로 둔다.

### 포트

### DTO

```python
# app/dtos/weather_dto.py
@dataclass(frozen=True)
class WeatherQuery:
    lat: float | None = None
    lon: float | None = None
    city: str | None = None
    country: str | None = None

    @property
    def has_coords(self) -> bool:
        return self.lat is not None and self.lon is not None

@dataclass(frozen=True)
class WeatherResult:
    city: str
    country: str
    temp_c: float
    feels_like_c: float
    description: str
    icon: str
    humidity: int
```

`WeatherResult`의 필드는 기존 `WeatherResponse`와 1:1로 맞춘다. 매핑은 `schemas/weather_schema.py`의 `to_weather_response`가 담당한다.

### 포트

```python
# app/ports/output/weather_gateway.py
class WeatherUnavailableError(Exception):
    """이 게이트웨이로는 날씨를 가져오지 못했다 — 다음 후보로 넘어가라는 신호."""

class WeatherGateway(ABC):
    @abstractmethod
    def fetch(self, query: WeatherQuery) -> WeatherResult: ...
```

```python
# app/ports/output/place_name_gateway.py
class PlaceNameGateway(ABC):
    @abstractmethod
    def korean_name(self, lat: float, lon: float) -> str | None: ...
```

`korean_name`이 `None`을 반환하는 것은 실패가 아니라 **"한글 이름이 없다"** 는 정상 결과다. 예외로 만들지 않는다.

### 인터랙터 — 폴백 체인

```python
class WeatherInteractor(WeatherUseCase):
    def __init__(
        self,
        gateways: Sequence[WeatherGateway],
        place_names: PlaceNameGateway | None,
        default: WeatherResult,
    ) -> None: ...

    def get_weather(self, query: WeatherQuery) -> WeatherResult:
        for gateway in self._gateways:
            try:
                result = gateway.fetch(query)
            except WeatherUnavailableError:
                continue
            return self._with_korean_name(result, query)
        return self._default
```

- `_with_korean_name`은 좌표 질의일 때만 `place_names`를 부른다. 한글 이름을 못 얻으면 게이트웨이가 준 이름을 그대로 쓴다. **지명 하나 때문에 날씨 전체를 버리지 않는다.**
- 게이트웨이 목록의 **순서가 곧 우선순위**다. 조립은 `dependencies/`에서만 한다.

### 어댑터

| 어댑터 | 호출 | 비고 |
|---|---|---|
| `OpenWeatherGateway` | `/data/2.5/weather?lat=&lon=` 또는 `?q=city,country` (`units=metric`, `lang=kr`) | 응답의 `name`을 도시명으로 쓴다 |
| `OpenWeatherPlaceNameGateway` | `/geo/1.0/reverse?lat=&lon=&limit=1` | `local_names.ko`를 읽는다 |
| `OpenMeteoGateway` | `/v1/forecast?latitude=&longitude=&current=...&timezone=auto` | **좌표를 인자로 받는다.** 현재의 `SEOUL_LAT/SEOUL_LON` 하드코딩을 제거한다. 좌표가 없는 질의(도시명)는 처리할 수 없으므로 `WeatherUnavailableError`을 던진다 |

`OpenMeteoGateway`는 지명을 모른다. 좌표 질의에서 이 경로를 타면 `city`는 `"현재 위치"`로 채운다.

### 조립 (`dependencies/weather.py`)

```python
def get_weather_use_case() -> WeatherUseCase:
    appid = keymaker.get_openweather_api_key() if keymaker.is_openweather_ready() else None
    gateways: list[WeatherGateway] = []
    place_names: PlaceNameGateway | None = None
    if appid:
        gateways.append(
            OpenWeatherGateway(
                appid=appid,
                default_city=keymaker.get_openweather_default_city(),
                default_country=keymaker.get_openweather_default_country(),
            )
        )
        place_names = OpenWeatherPlaceNameGateway(appid=appid)
    gateways.append(OpenMeteoGateway())
    return WeatherInteractor(gateways=gateways, place_names=place_names, default=SEOUL_DEFAULT)
```

기본 도시·국가(`OPENWEATHER_DEFAULT_CITY/COUNTRY`)는 **게이트웨이에 주입**한다. 라우터는 설정을 모른다.

### `main.py` 변경

- `from weather_provider import fetch_seoul_weather` 제거
- `WeatherResponse` 모델과 `@app.get("/weather")` 핸들러 제거 (스키마와 라우터로 이동)
- `app.include_router(weather_router)` 추가
- `clover/apps/weather_provider.py` **삭제** — 로직이 전부 이동한다

### `.importlinter` 등록

`weather`를 네 곳에 추가한다.

1. `root_packages`
2. `auth-isolation` 계약의 `source_modules` (스포크는 `auth`를 import할 수 없다)
3. `star-topology-no-spoke-to-spoke` 계약의 `modules`
4. `hub-can-import-spokes` 계약의 스포크 목록

`fridge`·`titanic`처럼 클린 아키텍처 계약(`inbound`→`outbound` 금지, `use_cases`→`adapter` 금지)에도 `weather`를 추가한다. 새로 만드는 구조이므로 처음부터 검사받게 한다.

## 웹 (`lucky`)

- `lib/weather-api.ts` — `fetchWeather`가 `{ lat, lon }` 또는 `{ city, country }`를 받도록 시그니처를 넓힌다. 기존 호출부는 그대로 동작해야 한다.
- `components/weather-widget.tsx` — 위젯을 클릭 가능하게 만든다. 클릭 시 `navigator.geolocation.getCurrentPosition`으로 좌표를 얻어 재조회한다.
- 성공한 좌표는 기존 `cloverky-weather-v1` 캐시 옆에 함께 저장해, 다음 방문에는 탭하지 않아도 그 위치로 조회한다.
- 권한 거부·타임아웃·`navigator.geolocation` 미지원 → **서울 유지**. 사용자에게 에러를 띄우지 않는다.
- geolocation은 보안 컨텍스트(HTTPS)에서만 동작한다. Vercel 배포는 문제없고, 로컬 `http://localhost`도 허용된다.

## 앱 (`fortune`)

- 날씨 위젯을 `landing_screen.dart`에서 **별도 파일로 분리**한다 (`lib/weather/weather_pill.dart`). 지금은 랜딩 화면 안에 인라인으로 박혀 있어 상태를 가질 수 없다.
- 의존성 추가: `http`, `geolocator`
- 위치와 HTTP를 **인터페이스 뒤에 둔다** (`LocationService`, `WeatherApi`). 위젯 테스트에서 가짜를 주입하기 위해서다. 백엔드의 포트 개념과 같은 이유다.
- API base는 `--dart-define=API_BASE_URL`로 주입하고 기본값은 `https://api.cloverky.cloud`. 로컬 백엔드로도 돌릴 수 있게 한다.
- 권한 선언
  - Android `AndroidManifest.xml`: `ACCESS_COARSE_LOCATION`
  - iOS `Info.plist`: `NSLocationWhenInUseUsageDescription` — 사용 이유 문구 필수 (앱스토어 심사 대상)
- 상태는 세 가지뿐이다: **초기(서울 기본값)** · **조회 중** · **결과**. 실패는 별도 상태를 만들지 않고 서울 기본값으로 돌아간다.
- **앱은 좌표를 저장하지 않는다.** 앱을 다시 실행하면 서울 기본값으로 돌아가고, 위젯을 다시 탭해야 현재 위치가 반영된다. 웹과 다른 점이라 의도적으로 적어둔다 — 저장하려면 `shared_preferences` 의존성이 필요한데, 이번 기능 하나를 위해 저장소를 들이지 않는다. 사용해보고 불편하면 그때 추가한다.

## 테스트

| 영역 | 대상 | 방법 |
|---|---|---|
| 백엔드 | 폴백 체인 순서, 한글 지명 덮어쓰기, 전부 실패 시 기본값 | 가짜 게이트웨이 주입 — **네트워크 없음** |
| 백엔드 | `lat`만 보내면 422, 좌표 질의가 인터랙터에 그대로 전달됨 | `TestClient` + `dependency_overrides` |
| 앱 | 위젯 3상태, 권한 거부 시 서울 유지 | 가짜 `LocationService`·`WeatherApi` 주입 |
| 웹 | — | 테스트 프레임워크 미도입. `CLAUDE.md`가 "별도 논의 후"라고 정해 이번 범위에서 제외한다 |

`clover/pytest.ini`의 `testpaths`가 `apps/titanic/tests`로 한정돼 있으므로 `pytest apps/weather/tests`처럼 경로를 명시해 실행한다.

## 검증 명령

```bash
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml
cd clover && python -c "import main" && python -m importlinter
cd clover && pytest apps/weather/tests
cd lucky && npm run lint && npx prettier --write .
cd fortune && flutter analyze --fatal-infos && dart format --set-exit-if-changed . && flutter test
```

백엔드 코드 변경 후 반영: `cd clover && docker compose build backend && docker compose up -d backend`

## 범위 밖

이번 작업에 **포함하지 않는다.**

- 랜딩 화면의 버튼 동작과 앱 내 화면 추가 — 별도 설계가 필요한 큰 작업이다
- 웹 테스트 프레임워크 도입
- `applicationId`를 `com.example.fortune`에서 바꾸는 일
- 위치를 사용자가 직접 검색·선택하는 기능
