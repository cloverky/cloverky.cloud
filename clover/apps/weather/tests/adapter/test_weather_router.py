"""완료 기준: 좌표가 인터랙터까지 그대로 전달되고, 반쪽 좌표는 422 로 막히는지."""

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


def test_coordinates_reach_the_interactor() -> None:
    """좌표가 인터랙터까지 그대로 전달된다."""
    spy = SpyUseCase()
    response = build_client(spy).get("/weather", params={"lat": 37.5, "lon": 126.78})

    assert response.status_code == 200
    assert spy.seen == WeatherQuery(lat=37.5, lon=126.78, city=None, country=None)
    assert response.json()["city"] == "부천시"


def test_half_a_coordinate_is_rejected() -> None:
    """lat 만 오면 422. 조용히 무시하면 기본 도시 날씨를 현재 위치로 오해한다."""
    response = build_client(SpyUseCase()).get("/weather", params={"lat": 37.5})

    assert response.status_code == 422


def test_city_query_still_works() -> None:
    """좌표 없이도 기존처럼 동작한다."""
    spy = SpyUseCase()
    response = build_client(spy).get(
        "/weather", params={"city": "Seoul", "country": "KR"}
    )

    assert response.status_code == 200
    assert spy.seen == WeatherQuery(lat=None, lon=None, city="Seoul", country="KR")
