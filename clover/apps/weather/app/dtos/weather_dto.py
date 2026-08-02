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
    # 조회한 지점의 좌표. 도시명으로 물어도 제공자가 좌표를 함께 주므로,
    # 그 값으로 한글 지명을 찾을 수 있다. 응답 스키마에는 나가지 않는다.
    lat: float | None = None
    lon: float | None = None
