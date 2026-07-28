from admin.adapter.inbound.api.schemas.morningstar_schema import (
    InsightRequest,
    InsightResponse,
    to_insight_query,
    to_insight_response,
)
from admin.app.ports.input.morningstar_use_case import MorningstarUseCase
from admin.dependencies.morningstar_provider import get_morningstar_use_case
from fastapi import APIRouter, Depends, HTTPException

morningstar_router = APIRouter(prefix="/morningstar", tags=["morningstar"])


@morningstar_router.post("/insights", summary="맞춤형 금융 인사이트 생성")
async def generate_insight(
    request: InsightRequest,
    use_case: MorningstarUseCase = Depends(get_morningstar_use_case),
) -> InsightResponse:
    try:
        insight = await use_case.generate_insight(to_insight_query(request))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return to_insight_response(insight)
