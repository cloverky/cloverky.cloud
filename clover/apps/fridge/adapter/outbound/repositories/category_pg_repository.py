from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository

# ORM 은 main.py 와 같은 fridge. 경로로만 임포트한다. clover.apps.fridge. 로도
# 임포트하면 같은 모듈이 두 이름으로 로드돼 테이블이 중복 등록된다.
from fridge.adapter.outbound.orm.category_orm import CategoryOrm

logger = logging.getLogger(__name__)


class CategoryPgRepository(CategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(self) -> list[CategoryItem]:
        rows = (
            (
                await self.session.execute(
                    select(CategoryOrm).order_by(CategoryOrm.sort_order, CategoryOrm.id)
                )
            )
            .scalars()
            .all()
        )
        logger.info("[CategoryPgRepository] list_categories | count=%d", len(rows))
        return [
            CategoryItem(id=row.id, name=row.name, sort_order=row.sort_order)
            for row in rows
        ]
