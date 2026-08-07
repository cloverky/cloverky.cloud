from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from fridge.adapter.outbound.repositories.recipe_feedback_pg_repository import (
    RecipeFeedbackPgRepository,
)

"""
레시피 피드백 (Recipe Feedback)
추천받은 레시피에 남긴 좋아요·싫어요. 싫어요를 준 레시피는 다음 추천에서
빠지고, 취향 화면에서 지금까지 남긴 평가를 모아 볼 수 있다.
레시피는 추천할 때마다 만들어져 고정 ID 가 없으므로 이름을 키로 쓴다.
"""

recipe_feedback_router = APIRouter(prefix="/recipe-feedback", tags=["recipe-feedback"])


class FeedbackBody(BaseModel):
    recipe_name: str = Field(..., min_length=1, max_length=200)
    verdict: Literal["up", "down"]


class FeedbackItem(BaseModel):
    recipe_name: str
    verdict: str


class FeedbackListResponse(BaseModel):
    liked: list[str] = Field(default_factory=list, description="좋아요 준 레시피 이름")
    disliked: list[str] = Field(
        default_factory=list, description="싫어요 준 레시피 이름 — 추천에서 제외된다"
    )


@recipe_feedback_router.get("")
async def list_feedback(
    x_user_email: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> FeedbackListResponse:
    rows = await RecipeFeedbackPgRepository(db).list_all(x_user_email)
    return FeedbackListResponse(
        liked=[name for name, verdict in rows if verdict == "up"],
        disliked=[name for name, verdict in rows if verdict == "down"],
    )


@recipe_feedback_router.put("")
async def put_feedback(
    body: FeedbackBody,
    x_user_email: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """같은 평가를 다시 누르면 취소된다 — 토글로 동작한다."""
    verdict = await RecipeFeedbackPgRepository(db).put(
        x_user_email, body.recipe_name.strip(), body.verdict
    )
    return {"verdict": verdict}


@recipe_feedback_router.delete("")
async def clear_feedback(
    recipe_name: str = Query(..., description="평가를 지울 레시피 이름"),
    x_user_email: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    cleared = await RecipeFeedbackPgRepository(db).clear(x_user_email, recipe_name)
    return {"cleared": cleared}
