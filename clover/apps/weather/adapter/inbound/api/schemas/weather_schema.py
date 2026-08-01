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
