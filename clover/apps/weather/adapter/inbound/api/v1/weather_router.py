from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from weather.adapter.inbound.api.schemas.weather_schema import (
    WeatherResponse,
    to_weather_response,
)
from weather.app.dtos.weather_dto import WeatherQuery
from weather.app.ports.input.weather_use_case import WeatherUseCase
from weather.dependencies.weather import get_weather_use_case

weather_router = APIRouter(prefix="/weather", tags=["weather"])


@weather_router.get("", response_model=WeatherResponse)
def get_weather(
    lat: float | None = Query(None, ge=-90, le=90, description="위도"),
    lon: float | None = Query(None, ge=-180, le=180, description="경도"),
    city: str | None = Query(None, description="도시명 (미입력 시 기본값)"),
    country: str | None = Query(None, description="국가 코드 (예: KR)"),
    weather: WeatherUseCase = Depends(get_weather_use_case),
) -> WeatherResponse:
    """조회 실패는 폴백으로 흡수해 항상 200. 단 좌표가 반쪽이면 422 로 막는다."""
    if (lat is None) != (lon is None):
        # 조용히 무시하면 사용자는 위치가 반영된 줄 알고 기본 도시 날씨를 본다.
        raise HTTPException(status_code=422, detail="lat 과 lon 은 함께 보내야 합니다")
    return to_weather_response(
        weather.get_weather(WeatherQuery(lat=lat, lon=lon, city=city, country=country))
    )
