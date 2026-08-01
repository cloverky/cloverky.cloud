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
    """게이트웨이를 조립한다. 목록 순서가 폴백 우선순위다."""
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
