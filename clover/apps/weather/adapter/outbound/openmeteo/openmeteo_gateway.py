from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from weather.adapter.outbound.openmeteo import _wmo
from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.weather_gateway import (
    WeatherGateway,
    WeatherUnavailableError,
)

_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT_SECONDS = 10

# Open-Meteo 는 좌표만 받고 지명을 돌려주지 않는다.
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
