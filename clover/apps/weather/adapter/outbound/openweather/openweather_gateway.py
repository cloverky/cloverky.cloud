from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import (
    WeatherGateway,
    WeatherUnavailableError,
)

_WEATHER_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather"
_REVERSE_ENDPOINT = "https://api.openweathermap.org/geo/1.0/reverse"
_TIMEOUT_SECONDS = 10


def parse_openweather(data: dict[str, Any]) -> WeatherResult:
    main = data["weather"][0]
    coord = data.get("coord") or {}
    return WeatherResult(
        city=data["name"],
        country=data["sys"]["country"],
        temp_c=float(data["main"]["temp"]),
        feels_like_c=float(data["main"]["feels_like"]),
        description=main["description"],
        icon=main["icon"],
        humidity=int(data["main"]["humidity"]),
        lat=float(coord["lat"]) if "lat" in coord else None,
        lon=float(coord["lon"]) if "lon" in coord else None,
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
