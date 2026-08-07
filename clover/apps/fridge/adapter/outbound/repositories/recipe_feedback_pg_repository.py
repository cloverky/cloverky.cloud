from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from users.adapter.user import User as UserOrm

from fridge.adapter.outbound.orm.recipe_feedback_orm import RecipeFeedbackOrm


class RecipeFeedbackPgRepository:
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

    async def list_all(self, email: str) -> list[tuple[str, str]]:
        """이 회원이 남긴 (레시피 이름, 평가) 목록을 최근 순으로 반환한다."""
        user_id = await self._get_user_id(email)
        result = await self.session.execute(
            select(RecipeFeedbackOrm)
            .where(RecipeFeedbackOrm.user_id == user_id)
            .order_by(RecipeFeedbackOrm.updated_at.desc().nullslast())
        )
        return [(r.recipe_name, r.verdict) for r in result.scalars().all()]

    async def put(self, email: str, recipe_name: str, verdict: str) -> str:
        """평가를 남긴다. 같은 평가를 다시 누르면 취소로 보고 지운다.

        반환값은 적용 후 상태 — "up", "down", 또는 취소됐으면 "none".
        """
        user_id = await self._get_user_id(email)
        result = await self.session.execute(
            select(RecipeFeedbackOrm).where(
                RecipeFeedbackOrm.user_id == user_id,
                RecipeFeedbackOrm.recipe_name == recipe_name,
            )
        )
        row = result.scalar_one_or_none()

        if row is None:
            self.session.add(
                RecipeFeedbackOrm(
                    user_id=user_id, recipe_name=recipe_name, verdict=verdict
                )
            )
            await self.session.commit()
            return verdict

        if row.verdict == verdict:
            await self.session.delete(row)
            await self.session.commit()
            return "none"

        row.verdict = verdict
        await self.session.commit()
        return verdict

    async def clear(self, email: str, recipe_name: str) -> bool:
        """평가를 지운다. 남긴 적이 없으면 False."""
        user_id = await self._get_user_id(email)
        result = await self.session.execute(
            delete(RecipeFeedbackOrm).where(
                RecipeFeedbackOrm.user_id == user_id,
                RecipeFeedbackOrm.recipe_name == recipe_name,
            )
        )
        await self.session.commit()
        return result.rowcount > 0
