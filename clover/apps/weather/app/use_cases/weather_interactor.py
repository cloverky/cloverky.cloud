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
        if not query.has_coords or self._place_names is None:
            return result
        if query.lat is None or query.lon is None:
            return result
        korean = self._place_names.korean_name(query.lat, query.lon)
        return replace(result, city=korean) if korean else result
