"""완료 기준: 게이트웨이가 순서대로 시도되고, 지명 조회 실패가 날씨를 버리지 않는지."""

from __future__ import annotations

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import (
    WeatherGateway,
    WeatherUnavailableError,
)
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

COORDS = WeatherQuery(lat=37.5, lon=126.78)


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


def test_first_gateway_success_skips_the_rest() -> None:
    """첫 게이트웨이가 성공하면 다음은 부르지 않는다."""
    first, second = Succeeds(), Succeeds()
    interactor = WeatherInteractor([first, second], KoreanNames(), SEOUL_DEFAULT)

    interactor.get_weather(COORDS)

    assert first.calls == 1
    assert second.calls == 0


def test_falls_through_to_the_next_gateway() -> None:
    """첫 게이트웨이가 실패하면 다음으로 넘어간다."""
    first, second = AlwaysFails(), Succeeds()
    interactor = WeatherInteractor([first, second], KoreanNames(), SEOUL_DEFAULT)

    result = interactor.get_weather(COORDS)

    assert first.calls == 1
    assert second.calls == 1
    assert result.temp_c == 21.0


def test_coordinate_query_uses_the_korean_place_name() -> None:
    """좌표 질의는 한글 지명으로 덮어쓴다."""
    interactor = WeatherInteractor([Succeeds()], KoreanNames(), SEOUL_DEFAULT)

    assert interactor.get_weather(COORDS).city == "부천시"


def test_keeps_the_original_name_when_no_korean_name() -> None:
    """한글 이름을 못 얻어도 날씨는 그대로 쓴다."""
    interactor = WeatherInteractor([Succeeds()], NoNames(), SEOUL_DEFAULT)

    assert interactor.get_weather(COORDS).city == "Bucheon-si"


def test_city_query_leaves_the_name_alone() -> None:
    """도시명 질의는 역지오코딩을 타지 않는다."""
    interactor = WeatherInteractor([Succeeds()], KoreanNames(), SEOUL_DEFAULT)

    result = interactor.get_weather(WeatherQuery(city="Seoul", country="KR"))

    assert result.city == "Bucheon-si"


def test_returns_the_default_when_every_gateway_fails() -> None:
    """전부 실패하면 기본값을 돌려준다."""
    interactor = WeatherInteractor(
        [AlwaysFails(), AlwaysFails()], KoreanNames(), SEOUL_DEFAULT
    )

    assert interactor.get_weather(COORDS) == SEOUL_DEFAULT
