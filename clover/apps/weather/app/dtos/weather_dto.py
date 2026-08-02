from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WeatherQuery:
    lat: float | None = None
    lon: float | None = None
    city: str | None = None
    country: str | None = None

    @property
    def has_coords(self) -> bool:
        return self.lat is not None and self.lon is not None


@dataclass(frozen=True)
class WeatherResult:
    city: str
    country: str
    temp_c: float
    feels_like_c: float
    description: str
    icon: str
    humidity: int
