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
