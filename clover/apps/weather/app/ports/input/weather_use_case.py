from __future__ import annotations

from abc import ABC, abstractmethod

from weather.app.dtos.weather_dto import WeatherQuery, WeatherResult


class WeatherUseCase(ABC):
    @abstractmethod
    def get_weather(self, query: WeatherQuery) -> WeatherResult:
        pass
