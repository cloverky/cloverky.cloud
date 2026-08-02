from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.app.ports.output.place_name_gateway import PlaceNameGateway
from weather.app.ports.output.weather_gateway import (
    WeatherGateway,
    WeatherUnavailableError,
)


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
        if self._place_names is None:
            return result
        # 도시명으로 물었더라도 제공자가 좌표를 돌려줬다면 그걸로 찾는다.
        # 그래야 기본 상태에서도 "Seoul" 대신 "서울"이 보인다.
        lat = query.lat if query.has_coords else result.lat
        lon = query.lon if query.has_coords else result.lon
        if lat is None or lon is None:
            return result
        korean = self._place_names.korean_name(lat, lon)
        return replace(result, city=korean) if korean else result
