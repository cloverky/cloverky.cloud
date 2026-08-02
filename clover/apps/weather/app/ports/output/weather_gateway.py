from __future__ import annotations

from abc import ABC, abstractmethod

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult


class WeatherUnavailableError(Exception):
    """이 게이트웨이로는 못 가져왔다 — 다음 후보로 넘어가라는 신호."""


class WeatherGateway(ABC):
    @abstractmethod
    def fetch(self, query: WeatherQuery) -> WeatherResult:
        pass
