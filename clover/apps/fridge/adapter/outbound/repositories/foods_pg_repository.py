from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository

# ORM 은 main.py 와 같은 fridge. 경로로만 임포트한다. clover.apps.fridge. 로도
# 임포트하면 같은 모듈이 두 이름으로 로드돼 테이블이 중복 등록된다.
from fridge.adapter.outbound.orm.foods_orm import FoodsOrm

logger = logging.getLogger(__name__)


class FoodsPgRepository(FoodsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        # 이름이 비어 있는 행은 화면에 빈 줄로 보이므로 제외한다.
        statement = select(FoodsOrm).where(FoodsOrm.name.is_not(None))
        if category_id is not None:
            statement = statement.where(FoodsOrm.category_id == category_id)

        rows = (
            (await self.session.execute(statement.order_by(FoodsOrm.name)))
            .scalars()
            .all()
        )
        logger.info("[FoodsPgRepository] list_foods | count=%d", len(rows))
        return [
            FoodItem(
                id=row.id,
                name=row.name or "",
                category_id=row.category_id,
                default_unit=row.default_unit,
            )
            for row in rows
        ]
