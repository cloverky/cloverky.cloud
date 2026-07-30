from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from fridge.adapter.outbound.repositories.game_score_pg_repository import (
    GameScorePgRepository,
)

"""
미니게임 기록 (Game Score)
냉장고 달리기 같은 미니게임의 사용자별 최고 기록을 보관한다.
게임 이름을 경로로 받아 한 테이블에서 여러 게임을 함께 관리한다.
"""

game_score_router = APIRouter(prefix="/game-scores", tags=["game-score"])


class SubmitScoreBody(BaseModel):
    # 프레임 기반 점수라 상한을 둔다 — 비정상 값이 기록에 남는 것을 막는다.
    score: int = Field(ge=0, le=1_000_000)


@game_score_router.get("/{game}")
async def get_best_score(
    game: str,
    x_user_email: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    best, plays = await GameScorePgRepository(db).get_best(x_user_email, game)
    return {"game": game, "best_score": best, "play_count": plays}


@game_score_router.post("/{game}")
async def submit_score(
    game: str,
    body: SubmitScoreBody,
    x_user_email: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    best, is_record, plays = await GameScorePgRepository(db).submit(
        x_user_email, game, body.score
    )
    return {
        "game": game,
        "best_score": best,
        "is_record": is_record,
        "play_count": plays,
    }
