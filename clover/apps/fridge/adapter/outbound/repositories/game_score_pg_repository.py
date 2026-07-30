from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from users.adapter.user import User as UserOrm

from fridge.adapter.outbound.orm.game_score_orm import GameScoreOrm


class GameScorePgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _get_user_id(self, email: str) -> int:
        result = await self.session.execute(
            select(UserOrm).where(UserOrm.email == email)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        return user.id

    async def get_best(self, email: str, game: str) -> tuple[int, int]:
        """(최고 점수, 플레이 횟수). 기록이 없으면 (0, 0)."""
        user_id = await self._get_user_id(email)
        result = await self.session.execute(
            select(GameScoreOrm).where(
                GameScoreOrm.user_id == user_id, GameScoreOrm.game == game
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            return 0, 0
        return row.best_score, row.play_count

    async def submit(self, email: str, game: str, score: int) -> tuple[int, bool, int]:
        """점수를 기록한다. 반환값은 (최고 점수, 신기록 여부, 플레이 횟수)."""
        user_id = await self._get_user_id(email)
        result = await self.session.execute(
            select(GameScoreOrm).where(
                GameScoreOrm.user_id == user_id, GameScoreOrm.game == game
            )
        )
        row = result.scalar_one_or_none()

        if not row:
            row = GameScoreOrm(
                user_id=user_id, game=game, best_score=score, play_count=1
            )
            self.session.add(row)
            await self.session.commit()
            # 첫 기록은 0점이어도 신기록으로 보지 않는다 — 축하할 게 없다.
            return score, score > 0, 1

        row.play_count += 1
        is_record = score > row.best_score
        if is_record:
            row.best_score = score
        await self.session.commit()
        return row.best_score, is_record, row.play_count
