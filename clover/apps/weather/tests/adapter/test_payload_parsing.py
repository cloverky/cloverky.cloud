"""완료 기준: 외부 응답 모양이 우리 DTO 로 정확히 옮겨지는지 — 네트워크 없이."""

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


def test_openweather_payload_maps_onto_the_dto() -> None:
    """OpenWeather 응답을 DTO 로 옮긴다."""
    result = parse_openweather(OPENWEATHER_SAMPLE)

    assert result.city == "Bucheon-si"
    assert result.country == "KR"
    assert result.temp_c == 21.4
    assert result.feels_like_c == 20.8
    assert result.description == "맑음"
    assert result.icon == "01d"
    assert result.humidity == 40


def test_open_meteo_has_no_place_name() -> None:
    """Open-Meteo 는 지명을 모르므로 '현재 위치'로 채운다."""
    result = parse_open_meteo(OPEN_METEO_SAMPLE)

    assert result.city == "현재 위치"
    assert result.temp_c == 21.4
    assert result.description == "맑음"
    assert result.icon == "01d"


def test_open_meteo_reuses_the_temperature_as_feels_like() -> None:
    """Open-Meteo 는 체감온도를 주지 않으므로 기온을 그대로 쓴다."""
    result = parse_open_meteo(OPEN_METEO_SAMPLE)

    assert result.feels_like_c == result.temp_c
