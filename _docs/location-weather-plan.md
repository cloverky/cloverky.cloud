# 위치 기반 날씨 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 날씨 위젯을 탭하면 현재 위치의 날씨를 한글 지명과 함께 보여준다. 웹과 앱 모두.

**Architecture:** 백엔드에 `weather` 스포크를 헥사고날로 새로 만든다. 인터랙터가 폴백 순서만 알고 게이트웨이가 외부 호출만 담당해, 폴백 로직을 네트워크 없이 테스트한다. 웹과 앱은 좌표만 보내고 API 키는 서버에만 둔다.

**Tech Stack:** FastAPI · Python (urllib, 신규 의존성 없음) / Next.js 16 · TypeScript / Flutter (`http`, `geolocator`)

**설계 문서:** `_docs/location-weather-design.md`

## Global Constraints

- 브랜치는 `soyeon`. 커밋은 각 태스크 끝에서 한다.
- 모든 명령은 해당 앱 디렉터리에서 실행한다. 저장소 루트에는 스크립트가 없다.
- 백엔드 import 경로는 `weather.app...` 형태다. `clover.apps.weather`, `apps.weather`는 금지다.
- 모든 Python 파일은 `from __future__ import annotations` 로 시작한다.
- 포트는 `ABC` + `@abstractmethod`, 본문은 `pass`.
- `weather` 패키지의 모든 `__init__.py` 는 **0바이트**여야 한다.
- 응답 스키마(`city`, `country`, `temp_c`, `feels_like_c`, `description`, `icon`, `humidity`)는 **바꾸지 않는다.**
- `/weather` 는 실패해도 **항상 200** 을 반환한다. 단 `lat`/`lon` 중 하나만 온 경우는 **422**.
- API 키는 서버에만 둔다. 클라이언트가 OpenWeather를 직접 부르지 않는다.
- 새 Python 의존성을 추가하지 않는다. HTTP 호출은 기존 `weather_provider.py` 와 같이 `urllib` 로 한다.
- 비밀값을 코드·문서·커밋에 넣지 않는다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `clover/apps/weather/app/dtos/weather_dto.py` | `WeatherQuery`, `WeatherResult` |
| `clover/apps/weather/app/ports/input/weather_use_case.py` | `WeatherUseCase` |
| `clover/apps/weather/app/ports/output/weather_gateway.py` | `WeatherGateway`, `WeatherUnavailableError` |
| `clover/apps/weather/app/ports/output/place_name_gateway.py` | `PlaceNameGateway` |
| `clover/apps/weather/app/use_cases/weather_interactor.py` | 폴백 순서 결정 |
| `clover/apps/weather/app/use_cases/_defaults.py` | 최종 폴백 상수 |
| `clover/apps/weather/adapter/outbound/openweather/openweather_gateway.py` | OpenWeather 날씨 + 역지오코딩 |
| `clover/apps/weather/adapter/outbound/openmeteo/openmeteo_gateway.py` | Open-Meteo 날씨 |
| `clover/apps/weather/adapter/outbound/openmeteo/_wmo.py` | WMO 코드 → 한글·아이콘 |
| `clover/apps/weather/adapter/inbound/api/schemas/weather_schema.py` | `WeatherResponse`, `to_weather_response` |
| `clover/apps/weather/adapter/inbound/api/v1/weather_router.py` | HTTP 파싱·위임 |
| `clover/apps/weather/dependencies/weather.py` | 조립 |
| `lucky/lib/weather-api.ts` | 좌표 질의 지원 |
| `lucky/components/weather-widget.tsx` | 탭 → 위치 요청 |
| `fortune/lib/weather/weather_pill.dart` | 위젯 (랜딩에서 분리) |
| `fortune/lib/weather/weather_api.dart` | HTTP 포트 + 구현 |
| `fortune/lib/weather/location_service.dart` | 위치 포트 + 구현 |

---

## Task 1: weather 스포크의 핵심 — DTO·포트·인터랙터

네트워크를 전혀 타지 않는 부분만 먼저 만든다. 이 태스크가 끝나면 폴백 순서를 테스트로 고정할 수 있다.

**Files:**
- Create: `clover/apps/weather/app/dtos/weather_dto.py`
- Create: `clover/apps/weather/app/ports/input/weather_use_case.py`
- Create: `clover/apps/weather/app/ports/output/weather_gateway.py`
- Create: `clover/apps/weather/app/ports/output/place_name_gateway.py`
- Create: `clover/apps/weather/app/use_cases/weather_interactor.py`
- Create: `clover/apps/weather/app/use_cases/_defaults.py`
- Create: `clover/apps/weather/tests/app/test_weather_interactor.py`
- Modify: `clover/.importlinter`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `WeatherQuery(lat, lon, city, country)` — `has_coords: bool` 프로퍼티
  - `WeatherResult(city, country, temp_c, feels_like_c, description, icon, humidity)`
  - `WeatherUseCase.get_weather(query: WeatherQuery) -> WeatherResult`
  - `WeatherGateway.fetch(query: WeatherQuery) -> WeatherResult` (실패 시 `WeatherUnavailableError`)
  - `PlaceNameGateway.korean_name(lat: float, lon: float) -> str | None`
  - `WeatherInteractor(gateways, place_names, default)`
  - `SEOUL_DEFAULT: WeatherResult`

- [ ] **Step 1: 패키지 뼈대 만들기**

```bash
cd clover
mkdir -p apps/weather/app/dtos apps/weather/app/ports/input apps/weather/app/ports/output \
         apps/weather/app/use_cases apps/weather/tests/app
find apps/weather -type d -exec touch {}/__init__.py \;
find apps/weather -name __init__.py -size +0 -print
```

마지막 명령은 아무것도 출력하지 않아야 한다 (모든 `__init__.py` 가 0바이트).

- [ ] **Step 2: DTO 작성**

`apps/weather/app/dtos/weather_dto.py`:

```python
from __future__ import annotations

from dataclasses import dataclass


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

- [ ] **Step 3: 포트 작성**

`apps/weather/app/ports/output/weather_gateway.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult


class WeatherUnavailableError(Exception):
    """이 게이트웨이로는 못 가져왔다 — 다음 후보로 넘어가라는 신호."""


class WeatherGateway(ABC):
    @abstractmethod
    def fetch(self, query: WeatherQuery) -> WeatherResult:
        pass
```

`apps/weather/app/ports/output/place_name_gateway.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod


class PlaceNameGateway(ABC):
    @abstractmethod
    def korean_name(self, lat: float, lon: float) -> str | None:
        pass
```

`apps/weather/app/ports/input/weather_use_case.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult


class WeatherUseCase(ABC):
    @abstractmethod
    def get_weather(self, query: WeatherQuery) -> WeatherResult:
        pass
```

- [ ] **Step 4: 실패하는 테스트 작성**

`apps/weather/tests/app/test_weather_interactor.py`:

```python
"""완료 기준: 게이트웨이가 순서대로 시도되고, 지명 조회 실패가 날씨를 버리지 않는지."""

from __future__ import annotations

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import WeatherGateway, WeatherUnavailableError
from weather.app.use_cases._defaults import SEOUL_DEFAULT
from weather.app.use_cases.weather_interactor import WeatherInteractor

SAMPLE = WeatherResult(
    city="Bucheon-si",
    country="KR",
    temp_c=21.0,
    feels_like_c=20.0,
    description="맑음",
    icon="01d",
    humidity=40,
)


class AlwaysFails(WeatherGateway):
    def __init__(self) -> None:
        self.calls = 0

    def fetch(self, query: WeatherQuery) -> WeatherResult:
        self.calls += 1
        raise WeatherUnavailableError("nope")


class Succeeds(WeatherGateway):
    def __init__(self, result: WeatherResult = SAMPLE) -> None:
        self.calls = 0
        self._result = result

    def fetch(self, query: WeatherQuery) -> WeatherResult:
        self.calls += 1
        return self._result


class KoreanNames(PlaceNameGateway):
    def korean_name(self, lat: float, lon: float) -> str | None:
        return "부천시"


class NoNames(PlaceNameGateway):
    def korean_name(self, lat: float, lon: float) -> str | None:
        return None


COORDS = WeatherQuery(lat=37.5, lon=126.78)


def test_첫_게이트웨이가_성공하면_다음은_부르지_않는다() -> None:
    first, second = Succeeds(), Succeeds()
    interactor = WeatherInteractor([first, second], KoreanNames(), SEOUL_DEFAULT)

    interactor.get_weather(COORDS)

    assert first.calls == 1
    assert second.calls == 0


def test_첫_게이트웨이가_실패하면_다음으로_넘어간다() -> None:
    first, second = AlwaysFails(), Succeeds()
    interactor = WeatherInteractor([first, second], KoreanNames(), SEOUL_DEFAULT)

    result = interactor.get_weather(COORDS)

    assert first.calls == 1
    assert second.calls == 1
    assert result.temp_c == 21.0


def test_좌표_질의는_한글_지명으로_덮어쓴다() -> None:
    interactor = WeatherInteractor([Succeeds()], KoreanNames(), SEOUL_DEFAULT)

    assert interactor.get_weather(COORDS).city == "부천시"


def test_한글_지명이_없으면_원래_이름을_쓴다() -> None:
    interactor = WeatherInteractor([Succeeds()], NoNames(), SEOUL_DEFAULT)

    assert interactor.get_weather(COORDS).city == "Bucheon-si"


def test_도시명_질의는_지명을_건드리지_않는다() -> None:
    names = KoreanNames()
    interactor = WeatherInteractor([Succeeds()], names, SEOUL_DEFAULT)

    result = interactor.get_weather(WeatherQuery(city="Seoul", country="KR"))

    assert result.city == "Bucheon-si"


def test_전부_실패하면_기본값을_돌려준다() -> None:
    interactor = WeatherInteractor([AlwaysFails(), AlwaysFails()], KoreanNames(), SEOUL_DEFAULT)

    assert interactor.get_weather(COORDS) == SEOUL_DEFAULT
```

- [ ] **Step 5: 테스트가 실패하는지 확인**

```bash
cd clover && pytest apps/weather/tests -q
```

기대: FAIL — `weather.app.use_cases.weather_interactor` 를 찾을 수 없다는 import 오류.

- [ ] **Step 6: 기본값 상수와 인터랙터 구현**

`apps/weather/app/use_cases/_defaults.py`:

```python
from __future__ import annotations

from weather.app.dtos.weather_dto import WeatherResult

SEOUL_DEFAULT = WeatherResult(
    city="Seoul",
    country="KR",
    temp_c=18.0,
    feels_like_c=18.0,
    description="맑음",
    icon="01d",
    humidity=55,
)
```

`apps/weather/app/use_cases/weather_interactor.py`:

```python
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import WeatherGateway, WeatherUnavailableError


class WeatherInteractor(WeatherUseCase):
    """게이트웨이를 주어진 순서대로 시도한다. 목록 순서가 곧 우선순위다."""

    def __init__(
        self,
        gateways: Sequence[WeatherGateway],
        place_names: PlaceNameGateway | None,
        default: WeatherResult,
    ) -> None:
        self._gateways = gateways
        self._place_names = place_names
        self._default = default

    def get_weather(self, query: WeatherQuery) -> WeatherResult:
        for gateway in self._gateways:
            try:
                result = gateway.fetch(query)
            except WeatherUnavailableError:
                continue
            return self._with_korean_name(result, query)
        return self._default

    def _with_korean_name(
        self, result: WeatherResult, query: WeatherQuery
    ) -> WeatherResult:
        # 지명 하나 때문에 날씨 전체를 버리지 않는다.
        if not query.has_coords or self._place_names is None:
            return result
        assert query.lat is not None and query.lon is not None
        korean = self._place_names.korean_name(query.lat, query.lon)
        return replace(result, city=korean) if korean else result
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
cd clover && pytest apps/weather/tests -q
```

기대: PASS — 6개 모두.

- [ ] **Step 8: `.importlinter` 에 weather 등록**

`clover/.importlinter` 에서 네 곳을 수정한다.

1. `[importlinter]` 의 `root_packages` 목록 끝에 `weather` 추가
2. `[importlinter:contract:auth-isolation]` 의 `source_modules` 목록에 `weather` 추가
3. `[importlinter:contract:star-topology-no-spoke-to-spoke]` 의 `modules` 목록에 `weather` 추가
4. `[importlinter:contract:hub-can-import-spokes]` 의 두 번째 layer 줄 끝에 ` | weather` 추가

그리고 새 구조를 처음부터 검사받도록 기존 두 계약에 weather를 더한다.

- `[importlinter:contract:clean-arch-inbound-no-outbound]`: `source_modules` 에 `weather.adapter.inbound`, `forbidden_modules` 에 `weather.adapter.outbound` 추가
- `[importlinter:contract:clean-arch-usecase-no-adapter]`: `source_modules` 에 `weather.app.use_cases`, `forbidden_modules` 에 `weather.adapter` 추가

- [ ] **Step 9: 하네스 실행**

```bash
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml
cd clover && python -m importlinter
```

기대: ruff·mypy 통과, importlinter 계약 위반 0.

- [ ] **Step 10: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/apps/weather clover/.importlinter
git commit -m "feat(weather): add ports, DTOs and the fallback interactor"
```

---

## Task 2: 외부 어댑터 — OpenWeather · Open-Meteo

HTTP 호출과 응답 파싱을 나눈다. 파싱은 순수 함수라 샘플 JSON으로 테스트할 수 있고, 호출부는 얇게 남는다.

**Files:**
- Create: `clover/apps/weather/adapter/outbound/openweather/openweather_gateway.py`
- Create: `clover/apps/weather/adapter/outbound/openmeteo/_wmo.py`
- Create: `clover/apps/weather/adapter/outbound/openmeteo/openmeteo_gateway.py`
- Create: `clover/apps/weather/tests/adapter/test_payload_parsing.py`

**Interfaces:**
- Consumes: `WeatherQuery`, `WeatherResult`, `WeatherGateway`, `WeatherUnavailableError`, `PlaceNameGateway` (Task 1)
- Produces:
  - `OpenWeatherGateway(appid: str, default_city: str, default_country: str)`
  - `OpenWeatherPlaceNameGateway(appid: str)`
  - `OpenMeteoGateway()`
  - 파싱 함수 `parse_openweather(data: dict) -> WeatherResult`, `parse_open_meteo(data: dict) -> WeatherResult`

- [ ] **Step 1: 디렉터리와 실패하는 테스트 작성**

```bash
cd clover
mkdir -p apps/weather/adapter/outbound/openweather apps/weather/adapter/outbound/openmeteo \
         apps/weather/adapter/inbound/api/schemas apps/weather/adapter/inbound/api/v1 \
         apps/weather/tests/adapter
find apps/weather/adapter apps/weather/tests -type d -exec touch {}/__init__.py \;
```

`apps/weather/tests/adapter/test_payload_parsing.py`:

```python
"""완료 기준: 외부 응답 모양이 우리 DTO로 정확히 옮겨지는지 — 네트워크 없이."""

from __future__ import annotations

from weather.adapter.outbound.openmeteo.openmeteo_gateway import parse_open_meteo
from weather.adapter.outbound.openweather.openweather_gateway import parse_openweather

OPENWEATHER_SAMPLE = {
    "name": "Bucheon-si",
    "sys": {"country": "KR"},
    "main": {"temp": 21.4, "feels_like": 20.8, "humidity": 40},
    "weather": [{"description": "맑음", "icon": "01d"}],
}

OPEN_METEO_SAMPLE = {
    "current": {
        "temperature_2m": 21.4,
        "relative_humidity_2m": 40,
        "weather_code": 0,
    }
}


def test_openweather_응답을_DTO로_옮긴다() -> None:
    result = parse_openweather(OPENWEATHER_SAMPLE)

    assert result.city == "Bucheon-si"
    assert result.country == "KR"
    assert result.temp_c == 21.4
    assert result.feels_like_c == 20.8
    assert result.description == "맑음"
    assert result.icon == "01d"
    assert result.humidity == 40


def test_open_meteo_는_지명을_모르므로_현재_위치로_채운다() -> None:
    result = parse_open_meteo(OPEN_METEO_SAMPLE)

    assert result.city == "현재 위치"
    assert result.temp_c == 21.4
    assert result.description == "맑음"
    assert result.icon == "01d"


def test_open_meteo_는_체감온도가_없으므로_기온을_그대로_쓴다() -> None:
    result = parse_open_meteo(OPEN_METEO_SAMPLE)

    assert result.feels_like_c == result.temp_c
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd clover && pytest apps/weather/tests/adapter -q
```

기대: FAIL — import 오류.

- [ ] **Step 3: WMO 매핑 옮기기**

`apps/weather/adapter/outbound/openmeteo/_wmo.py` 를 만들고, 기존 `clover/apps/weather_provider.py` 의 `_wmo_to_openweather_icon` 과 `_wmo_description_ko` 두 함수를 **내용 변경 없이** 옮긴다. 이름은 `to_icon`, `to_description_ko` 로 바꾼다 (모듈명이 이미 `_wmo` 라 접두사가 중복이다).

- [ ] **Step 4: Open-Meteo 게이트웨이 구현**

`apps/weather/adapter/outbound/openmeteo/openmeteo_gateway.py`:

```python
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from weather.adapter.outbound.openmeteo import _wmo
from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.weather_gateway import WeatherGateway, WeatherUnavailableError

_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT_SECONDS = 10

# Open-Meteo 는 지명을 돌려주지 않는다.
_UNKNOWN_PLACE = "현재 위치"


def parse_open_meteo(data: dict[str, Any]) -> WeatherResult:
    current = data["current"]
    code = int(current["weather_code"])
    temp = float(current["temperature_2m"])
    return WeatherResult(
        city=_UNKNOWN_PLACE,
        country="",
        temp_c=temp,
        feels_like_c=temp,
        description=_wmo.to_description_ko(code),
        icon=_wmo.to_icon(code),
        humidity=int(current.get("relative_humidity_2m", 50)),
    )


class OpenMeteoGateway(WeatherGateway):
    """좌표 전용. 도시명 질의는 처리할 수 없다."""

    def fetch(self, query: WeatherQuery) -> WeatherResult:
        if not query.has_coords:
            raise WeatherUnavailableError("Open-Meteo needs coordinates")
        params = urllib.parse.urlencode(
            {
                "latitude": query.lat,
                "longitude": query.lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code",
                "timezone": "auto",
            }
        )
        try:
            with urllib.request.urlopen(
                f"{_ENDPOINT}?{params}", timeout=_TIMEOUT_SECONDS
            ) as resp:
                data = json.loads(resp.read().decode())
            return parse_open_meteo(data)
        except (
            urllib.error.URLError,
            json.JSONDecodeError,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            raise WeatherUnavailableError(str(exc)) from exc
```

- [ ] **Step 5: OpenWeather 게이트웨이 구현**

`apps/weather/adapter/outbound/openweather/openweather_gateway.py`:

```python
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import WeatherGateway, WeatherUnavailableError

_WEATHER_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather"
_REVERSE_ENDPOINT = "https://api.openweathermap.org/geo/1.0/reverse"
_TIMEOUT_SECONDS = 10


def parse_openweather(data: dict[str, Any]) -> WeatherResult:
    main = data["weather"][0]
    return WeatherResult(
        city=data["name"],
        country=data["sys"]["country"],
        temp_c=float(data["main"]["temp"]),
        feels_like_c=float(data["main"]["feels_like"]),
        description=main["description"],
        icon=main["icon"],
        humidity=int(data["main"]["humidity"]),
    )


def _get_json(url: str) -> Any:
    with urllib.request.urlopen(url, timeout=_TIMEOUT_SECONDS) as resp:
        return json.loads(resp.read().decode())


class OpenWeatherGateway(WeatherGateway):
    def __init__(self, appid: str, default_city: str, default_country: str) -> None:
        self._appid = appid
        self._default_city = default_city
        self._default_country = default_country

    def fetch(self, query: WeatherQuery) -> WeatherResult:
        params: dict[str, Any] = {
            "appid": self._appid,
            "units": "metric",
            "lang": "kr",
        }
        if query.has_coords:
            params["lat"] = query.lat
            params["lon"] = query.lon
        else:
            city = (query.city or self._default_city).strip()
            country = (query.country or self._default_country).strip()
            params["q"] = f"{city},{country}"
        try:
            data = _get_json(f"{_WEATHER_ENDPOINT}?{urllib.parse.urlencode(params)}")
            return parse_openweather(data)
        except (
            urllib.error.URLError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
        ) as exc:
            raise WeatherUnavailableError(str(exc)) from exc


class OpenWeatherPlaceNameGateway(PlaceNameGateway):
    def __init__(self, appid: str) -> None:
        self._appid = appid

    def korean_name(self, lat: float, lon: float) -> str | None:
        params = urllib.parse.urlencode(
            {"lat": lat, "lon": lon, "limit": 1, "appid": self._appid}
        )
        try:
            data = _get_json(f"{_REVERSE_ENDPOINT}?{params}")
        except (urllib.error.URLError, json.JSONDecodeError, ValueError):
            return None
        if not data:
            return None
        korean = data[0].get("local_names", {}).get("ko")
        return korean if isinstance(korean, str) and korean else None
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd clover && pytest apps/weather/tests -q
```

기대: PASS — Task 1의 6개 + 이번 3개.

- [ ] **Step 7: 하네스 실행**

```bash
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml
cd clover && python -m importlinter
```

- [ ] **Step 8: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/apps/weather
git commit -m "feat(weather): add OpenWeather and Open-Meteo gateways"
```

---

## Task 3: 라우터 배선과 기존 코드 정리

여기까지 끝나면 `GET /weather?lat=&lon=` 이 실제로 동작한다.

**Files:**
- Create: `clover/apps/weather/adapter/inbound/api/schemas/weather_schema.py`
- Create: `clover/apps/weather/adapter/inbound/api/v1/weather_router.py`
- Create: `clover/apps/weather/dependencies/weather.py`
- Create: `clover/apps/weather/tests/adapter/test_weather_router.py`
- Modify: `clover/main.py` (89~96행 `WeatherResponse`, 392~410행 `get_weather`, 44행 import)
- Delete: `clover/apps/weather_provider.py`

**Interfaces:**
- Consumes: Task 1·2의 전부
- Produces: `weather_router` (prefix `/weather`), `get_weather_use_case() -> WeatherUseCase`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/weather/tests/adapter/test_weather_router.py`:

```python
"""완료 기준: 좌표가 인터랙터까지 그대로 전달되고, 반쪽 좌표는 422로 막히는지."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from weather.adapter.inbound.api.v1.weather_router import weather_router
from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.dependencies.weather import get_weather_use_case

SAMPLE = WeatherResult(
    city="부천시",
    country="KR",
    temp_c=21.0,
    feels_like_c=20.0,
    description="맑음",
    icon="01d",
    humidity=40,
)


class SpyUseCase(WeatherUseCase):
    def __init__(self) -> None:
        self.seen: WeatherQuery | None = None

    def get_weather(self, query: WeatherQuery) -> WeatherResult:
        self.seen = query
        return SAMPLE


def build_client(use_case: WeatherUseCase) -> TestClient:
    app = FastAPI()
    app.include_router(weather_router)
    app.dependency_overrides[get_weather_use_case] = lambda: use_case
    return TestClient(app)


def test_좌표가_인터랙터까지_전달된다() -> None:
    spy = SpyUseCase()
    response = build_client(spy).get("/weather", params={"lat": 37.5, "lon": 126.78})

    assert response.status_code == 200
    assert spy.seen == WeatherQuery(lat=37.5, lon=126.78, city=None, country=None)
    assert response.json()["city"] == "부천시"


def test_좌표가_하나만_오면_422() -> None:
    response = build_client(SpyUseCase()).get("/weather", params={"lat": 37.5})

    assert response.status_code == 422


def test_좌표_없이도_기존처럼_동작한다() -> None:
    spy = SpyUseCase()
    response = build_client(spy).get("/weather", params={"city": "Seoul", "country": "KR"})

    assert response.status_code == 200
    assert spy.seen == WeatherQuery(lat=None, lon=None, city="Seoul", country="KR")
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd clover && pytest apps/weather/tests/adapter/test_weather_router.py -q
```

기대: FAIL — import 오류.

- [ ] **Step 3: 스키마 작성**

`apps/weather/adapter/inbound/api/schemas/weather_schema.py`:

```python
from __future__ import annotations

from pydantic import BaseModel

from weather.app.dtos.weather_dto import WeatherResult


class WeatherResponse(BaseModel):
    city: str
    country: str
    temp_c: float
    feels_like_c: float
    description: str
    icon: str
    humidity: int


def to_weather_response(result: WeatherResult) -> WeatherResponse:
    return WeatherResponse(
        city=result.city,
        country=result.country,
        temp_c=result.temp_c,
        feels_like_c=result.feels_like_c,
        description=result.description,
        icon=result.icon,
        humidity=result.humidity,
    )
```

- [ ] **Step 4: 조립 작성**

`apps/weather/dependencies/weather.py`:

```python
from __future__ import annotations

from core.matrix.wault_keymaker_serect_manager import get_keymaker
from weather.adapter.outbound.openmeteo.openmeteo_gateway import OpenMeteoGateway
from weather.adapter.outbound.openweather.openweather_gateway import (
    OpenWeatherGateway,
    OpenWeatherPlaceNameGateway,
)
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import WeatherGateway
from weather.app.use_cases._defaults import SEOUL_DEFAULT
from weather.app.use_cases.weather_interactor import WeatherInteractor


def get_weather_use_case() -> WeatherUseCase:
    keymaker = get_keymaker()
    gateways: list[WeatherGateway] = []
    place_names: PlaceNameGateway | None = None

    # 키가 있을 때만 OpenWeather 를 1순위로 둔다. 없으면 Open-Meteo 만 남는다.
    if keymaker.is_openweather_ready():
        appid = keymaker.get_openweather_api_key()
        gateways.append(
            OpenWeatherGateway(
                appid=appid,
                default_city=keymaker.get_openweather_default_city(),
                default_country=keymaker.get_openweather_default_country(),
            )
        )
        place_names = OpenWeatherPlaceNameGateway(appid=appid)

    gateways.append(OpenMeteoGateway())
    return WeatherInteractor(
        gateways=gateways, place_names=place_names, default=SEOUL_DEFAULT
    )
```

`main.py` 의 `get_keymaker` import 경로(`core.matrix.wault_keymaker_serect_manager`)를 그대로 쓴다.

- [ ] **Step 5: 라우터 작성**

`apps/weather/adapter/inbound/api/v1/weather_router.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from weather.adapter.inbound.api.schemas.weather_schema import (
    WeatherResponse,
    to_weather_response,
)
from weather.app.dtos.weather_dto import WeatherQuery
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.dependencies.weather import get_weather_use_case

weather_router = APIRouter(prefix="/weather", tags=["weather"])


@weather_router.get("", response_model=WeatherResponse)
def get_weather(
    lat: float | None = Query(None, ge=-90, le=90, description="위도"),
    lon: float | None = Query(None, ge=-180, le=180, description="경도"),
    city: str | None = Query(None, description="도시명 (미입력 시 기본값)"),
    country: str | None = Query(None, description="국가 코드 (예: KR)"),
    weather: WeatherUseCase = Depends(get_weather_use_case),
) -> WeatherResponse:
    """실패해도 항상 200. 단 좌표가 반쪽이면 422로 막는다."""
    if (lat is None) != (lon is None):
        # 조용히 무시하면 사용자는 위치가 반영된 줄 알고 기본 도시 날씨를 본다.
        raise HTTPException(status_code=422, detail="lat 과 lon 은 함께 보내야 합니다")
    return to_weather_response(
        weather.get_weather(WeatherQuery(lat=lat, lon=lon, city=city, country=country))
    )
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd clover && pytest apps/weather/tests -q
```

기대: PASS — 12개 전부.

- [ ] **Step 7: `main.py` 배선 교체**

세 곳을 수정한다.

1. 44행 `from weather_provider import fetch_seoul_weather` 를 삭제하고, 다른 라우터 import 옆에 다음을 추가한다:

```python
from weather.adapter.inbound.api.v1.weather_router import weather_router
```

2. 89~96행의 `class WeatherResponse(BaseModel):` 블록 전체를 삭제한다 (스키마로 이동했다).

3. 392~410행의 `@app.get("/weather", ...)` 데코레이터와 `get_weather` 함수 전체를 삭제하고, 다른 `include_router` 호출 옆에 다음을 추가한다:

```python
app.include_router(weather_router)
```

- [ ] **Step 8: 기존 provider 삭제**

```bash
cd ~/projects/cloverky.cloud
git rm clover/apps/weather_provider.py
```

- [ ] **Step 9: import 정합성과 하네스**

```bash
cd clover && python -c "import main"
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml
cd clover && python -m importlinter
cd clover && pytest apps/weather/tests -q
```

기대: 전부 통과. `import main` 이 실패하면 `weather_provider` 참조가 남아 있는 것이다 — `grep -rn weather_provider clover/` 로 확인한다.

- [ ] **Step 10: 실제로 떠 있는 서버에 반영하고 확인**

```bash
cd clover && docker compose build backend && docker compose up -d backend
curl -s "http://localhost:8000/weather?lat=37.5665&lon=126.9780" | head -c 300
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000/weather?lat=37.5"
curl -s "http://localhost:8000/weather" | head -c 300
```

기대: 첫 번째는 한글 지명이 담긴 JSON, 두 번째는 `422`, 세 번째는 기존처럼 서울.

- [ ] **Step 11: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/apps/weather clover/main.py
git commit -m "feat(weather): serve coordinates through the new weather slice"
```

---

## Task 4: 웹 — 탭하면 현재 위치

**Files:**
- Modify: `lucky/lib/weather-api.ts`
- Modify: `lucky/components/weather-widget.tsx`

**Interfaces:**
- Consumes: `GET /weather?lat=&lon=` (Task 3)
- Produces: 없음 (웹 내부 변경)

테스트 프레임워크가 없으므로 (`CLAUDE.md`: 도입은 별도 논의) 이 태스크는 lint 와 수동 확인으로 검증한다.

- [ ] **Step 1: `fetchWeather` 가 좌표를 받게 넓히기**

`lucky/lib/weather-api.ts` 의 `fetchWeather` 시그니처를 다음으로 바꾼다. 기존 호출부(`fetchWeather("Seoul", "KR")`)가 깨지므로 Step 2에서 함께 고친다.

```ts
export type WeatherLocation =
  | { kind: "coords"; lat: number; lon: number }
  | { kind: "city"; city: string; country: string };

export async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const params =
    location.kind === "coords"
      ? new URLSearchParams({ lat: String(location.lat), lon: String(location.lon) })
      : new URLSearchParams({ city: location.city, country: location.country });
  const res = await fetch(`${API_BASE}/weather?${params}`, { cache: "no-store" });
  const data = (await res.json()) as WeatherData & FastApiErrorBody;
  if (!res.ok) throw new Error(parseApiError(data, res.status));
  return data;
}
```

좌표 캐시도 같은 파일에 둔다:

```ts
const COORDS_KEY = "cloverky-weather-coords-v1";

export function readCachedCoords(): { lat: number; lon: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as { lat: number; lon: number }) : null;
  } catch {
    return null;
  }
}

export function writeCachedCoords(lat: number, lon: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
  } catch {
    /* ignore quota */
  }
}
```

- [ ] **Step 2: 위젯을 탭 가능하게 만들기**

`lucky/components/weather-widget.tsx` 에서:

1. 61행 `const data = await fetchWeather("Seoul", "KR");` 를 다음으로 바꾼다.

```ts
const cached = readCachedCoords();
const data = await fetchWeather(
  cached
    ? { kind: "coords", lat: cached.lat, lon: cached.lon }
    : { kind: "city", city: "Seoul", country: "KR" },
);
```

2. `load` 콜백(58행) 아래에 위치 요청 핸들러를 추가한다.

```ts
const useMyLocation = useCallback(() => {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      writeCachedCoords(coords.latitude, coords.longitude);
      void load();
    },
    // 거부·타임아웃 모두 조용히 넘어간다. 지금 보이는 서울 날씨가 그대로 남는다.
    () => undefined,
    { timeout: 8000, maximumAge: 10 * 60 * 1000 },
  );
}, [load]);
```

3. 최상위 요소를 눌리게 바꾼다. 87행의 `<aside`, 93행의 `aria-label`, 그리고 닫는 `</aside>` 세 곳이다.

```tsx
    <button
      type="button"
      onClick={useMyLocation}
      className={cn(
        "pointer-events-auto self-end",
        "flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-1.5",
        "text-xs text-muted-foreground shadow-sm backdrop-blur-md",
      )}
      aria-label="현재 위치의 날씨 보기"
    >
```

`className` 값은 기존 `<aside>` 의 것을 **그대로** 옮긴다. 위젯 안에는 아이콘과 숫자뿐이라 `aria-label` 이 없으면 스크린리더가 읽을 게 없다.

- [ ] **Step 3: 하네스 실행**

```bash
cd lucky && npm run lint
cd lucky && npx prettier --write .
```

기대: lint 오류 0.

- [ ] **Step 4: 수동 확인**

```bash
cd lucky && npm run dev
```

브라우저에서 `http://localhost:3000` 을 연다.

기대: 처음엔 서울 날씨 → 위젯 클릭 → 브라우저 위치 권한 팝업 → 허용하면 현재 위치의 한글 지명과 기온으로 바뀐다. 거부하면 서울 그대로. 새로고침하면 허용했던 위치가 유지된다.

- [ ] **Step 5: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add lucky/lib/weather-api.ts lucky/components/weather-widget.tsx
git commit -m "feat(web): use the visitor's location for weather on tap"
```

---

## Task 5: 앱 — 날씨 위젯 분리와 위치 연동

**Files:**
- Create: `fortune/lib/weather/weather_api.dart`
- Create: `fortune/lib/weather/location_service.dart`
- Create: `fortune/lib/weather/weather_pill.dart`
- Create: `fortune/test/weather_pill_test.dart`
- Modify: `fortune/pubspec.yaml`
- Modify: `fortune/lib/landing_screen.dart` (날씨 위젯 인라인 블록을 `WeatherPill` 로 교체)
- Modify: `fortune/android/app/src/main/AndroidManifest.xml`
- Modify: `fortune/ios/Runner/Info.plist`

**Interfaces:**
- Consumes: `GET /weather?lat=&lon=` (Task 3)
- Produces: `WeatherPill` 위젯

- [ ] **Step 1: 의존성 추가**

```bash
cd fortune && flutter pub add http geolocator
```

- [ ] **Step 2: 실패하는 테스트 작성**

`fortune/test/weather_pill_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/weather/location_service.dart';
import 'package:fortune/weather/weather_api.dart';
import 'package:fortune/weather/weather_pill.dart';

class FakeLocation implements LocationService {
  FakeLocation(this._position);
  final Coords? _position;

  @override
  Future<Coords?> current() async => _position;
}

class FakeApi implements WeatherApi {
  FakeApi(this._reading);
  final WeatherReading _reading;
  Coords? asked;

  @override
  Future<WeatherReading> fetch({Coords? coords}) async {
    asked = coords;
    return _reading;
  }
}

const _seoul = WeatherReading(city: '서울', tempC: 18, description: '맑음');
const _bucheon = WeatherReading(city: '부천시', tempC: 21, description: '흐림');

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: child))));
}

void main() {
  testWidgets('처음에는 기본값을 보여준다', (tester) async {
    await _pump(tester, WeatherPill(api: FakeApi(_seoul), location: FakeLocation(null)));

    expect(find.textContaining('서울'), findsOneWidget);
  });

  testWidgets('탭하면 위치의 날씨로 바뀐다', (tester) async {
    final api = FakeApi(_bucheon);
    await _pump(
      tester,
      WeatherPill(api: api, location: FakeLocation(const Coords(37.5, 126.78))),
    );

    await tester.tap(find.byType(WeatherPill));
    await tester.pumpAndSettle();

    expect(api.asked, isNotNull);
    expect(find.textContaining('부천시'), findsOneWidget);
  });

  testWidgets('위치를 못 얻으면 기본값이 남는다', (tester) async {
    final api = FakeApi(_bucheon);
    await _pump(tester, WeatherPill(api: api, location: FakeLocation(null)));

    await tester.tap(find.byType(WeatherPill));
    await tester.pumpAndSettle();

    expect(api.asked, isNull);
    expect(find.textContaining('서울'), findsOneWidget);
  });
}
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
cd fortune && flutter test test/weather_pill_test.dart
```

기대: FAIL — `package:fortune/weather/...` 를 찾을 수 없다.

- [ ] **Step 4: 포트와 구현 작성**

`fortune/lib/weather/location_service.dart`:

```dart
import 'package:geolocator/geolocator.dart';

class Coords {
  const Coords(this.lat, this.lon);
  final double lat;
  final double lon;
}

/// 위젯이 geolocator 를 직접 부르지 않게 하는 경계. 테스트에서 가짜를 넣는다.
abstract class LocationService {
  /// 권한이 없거나 위치를 못 얻으면 null. 예외를 던지지 않는다.
  Future<Coords?> current();
}

class GeolocatorLocationService implements LocationService {
  @override
  Future<Coords?> current() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      );
      return Coords(position.latitude, position.longitude);
    } catch (_) {
      return null;
    }
  }
}
```

`fortune/lib/weather/weather_api.dart`:

```dart
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'location_service.dart';

class WeatherReading {
  const WeatherReading({
    required this.city,
    required this.tempC,
    required this.description,
  });

  final String city;
  final double tempC;
  final String description;
}

abstract class WeatherApi {
  Future<WeatherReading> fetch({Coords? coords});
}

class HttpWeatherApi implements WeatherApi {
  HttpWeatherApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cloverky.cloud',
  );

  @override
  Future<WeatherReading> fetch({Coords? coords}) async {
    final uri = Uri.parse('$_baseUrl/weather').replace(
      queryParameters: coords == null
          ? null
          : {'lat': '${coords.lat}', 'lon': '${coords.lon}'},
    );
    final response = await _client.get(uri);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return WeatherReading(
      city: data['city'] as String,
      tempC: (data['temp_c'] as num).toDouble(),
      description: data['description'] as String,
    );
  }
}
```

`geolocator` 는 버전에 따라 `getCurrentPosition` 의 인자가 다르다. 최신 버전은 `locationSettings`, 옛 버전은 `desiredAccuracy: LocationAccuracy.low` 를 받는다. `flutter analyze` 가 어느 쪽인지 바로 알려주므로 그에 맞춰 한 줄만 바꾼다.

- [ ] **Step 5: 위젯 작성**

`fortune/lib/weather/weather_pill.dart` 를 만든다. 겉모습은 `landing_screen.dart` 에 인라인으로 있던 것과 **동일하게** 유지한다 (흰 배경, `BorderRadius.circular(24)`, 그림자 `alpha 0.08`, `wb_sunny_outlined` 아이콘, 13pt `w500` 텍스트).

```dart
import 'package:flutter/material.dart';

import '../theme.dart';
import 'location_service.dart';
import 'weather_api.dart';

/// 탭하면 현재 위치의 날씨로 바꾼다. 실패하면 기본값이 그대로 남는다.
class WeatherPill extends StatefulWidget {
  const WeatherPill({super.key, required this.api, required this.location});

  final WeatherApi api;
  final LocationService location;

  @override
  State<WeatherPill> createState() => _WeatherPillState();
}

class _WeatherPillState extends State<WeatherPill> {
  static const WeatherReading _fallback = WeatherReading(
    city: '서울',
    tempC: 18,
    description: '맑음',
  );

  WeatherReading _reading = _fallback;
  bool _loading = false;

  Future<void> _useMyLocation() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final coords = await widget.location.current();
      // 위치를 못 얻으면 요청 자체를 하지 않는다 — 기본값이 남는다.
      if (coords == null) return;
      final reading = await widget.api.fetch(coords: coords);
      if (!mounted) return;
      setState(() => _reading = reading);
    } catch (error) {
      debugPrint('Weather lookup failed, keeping the default: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final temp = _reading.tempC.round();
    return GestureDetector(
      onTap: _useMyLocation,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wb_sunny_outlined, size: 16, color: kMutedFg),
            const SizedBox(width: 6),
            Text(
              '$temp°  ${_reading.description} · ${_reading.city}',
              style: const TextStyle(
                fontSize: 13,
                color: kFg,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd fortune && flutter test test/weather_pill_test.dart
```

기대: PASS — 3개.

- [ ] **Step 7: 랜딩 화면에서 교체**

`fortune/lib/landing_screen.dart` 의 "Weather widget — bottom right" 주석이 붙은 `Positioned` 안의 `Container(...)` 전체를 다음으로 바꾼다.

```dart
          Positioned(
            bottom: 36,
            right: 16,
            child: WeatherPill(
              api: HttpWeatherApi(),
              location: GeolocatorLocationService(),
            ),
          ),
```

파일 상단에 import 를 추가한다.

```dart
import 'weather/location_service.dart';
import 'weather/weather_api.dart';
import 'weather/weather_pill.dart';
```

- [ ] **Step 8: 권한 선언**

`fortune/android/app/src/main/AndroidManifest.xml` 의 `<manifest>` 바로 아래, `<application>` 앞에 추가한다.

```xml
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

`fortune/ios/Runner/Info.plist` 의 최상위 `<dict>` 안에 추가한다.

```xml
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>현재 위치의 날씨를 보여주기 위해 위치를 사용합니다.</string>
```

- [ ] **Step 9: 하네스와 전체 테스트**

```bash
cd fortune && dart format --set-exit-if-changed .
cd fortune && flutter analyze --fatal-infos
cd fortune && flutter test
```

기대: format 변경 0, analyze 이슈 0, 테스트 전부 통과.

- [ ] **Step 10: 에뮬레이터에서 확인**

```bash
cd fortune && flutter build apk --debug
adb install -r build/app/outputs/flutter-apk/app-debug.apk
adb shell am force-stop com.example.fortune
adb shell monkey -p com.example.fortune -c android.intent.category.LAUNCHER 1
```

에뮬레이터는 `fortune_api34` 를 쓴다. `Nexus_4_API_31` 은 영상이 재생되지 않는다.
에뮬레이터의 위치는 확장 메뉴(⋯) → Location 에서 지정할 수 있다.

기대: 인트로 영상 → 랜딩 → 날씨 알약을 탭하면 권한 팝업 → 허용하면 해당 위치의 한글 지명으로 바뀐다. 거부하면 `18° 맑음 · 서울` 그대로.

- [ ] **Step 11: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add fortune/lib/weather fortune/test/weather_pill_test.dart fortune/lib/landing_screen.dart \
        fortune/pubspec.yaml fortune/pubspec.lock \
        fortune/android/app/src/main/AndroidManifest.xml fortune/ios/Runner/Info.plist
git commit -m "feat(app): show weather for the device location on tap"
```

---

## 완료 기준

- `GET /weather?lat=&lon=` 이 한글 지명과 함께 응답한다. `lat` 만 보내면 422다.
- 웹과 앱 모두 위젯을 탭하면 현재 위치 날씨로 바뀌고, 거부하면 서울이 남는다.
- `ruff` · `mypy` · `importlinter` · `pytest apps/weather/tests` 전부 통과.
- `flutter analyze --fatal-infos` 0건, `flutter test` 통과, `npm run lint` 0건.
- `clover/apps/weather_provider.py` 가 삭제되고 이를 참조하는 코드가 없다.
