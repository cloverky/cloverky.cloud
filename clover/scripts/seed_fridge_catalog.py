"""fridge 카탈로그 기초 데이터. 여러 번 실행해도 결과가 같다.

실행:
    cd clover && docker compose run --rm --no-deps backend \
        sh -c 'cd /project/clover && PYTHONPATH=/project/clover/apps:/project/clover:/project \
               python scripts/seed_fridge_catalog.py'
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fridge.adapter.outbound.orm.category_orm import CategoryOrm
from fridge.adapter.outbound.orm.foods_orm import FoodsOrm
from fridge.models.database import engine

CATALOG: dict[str, list[tuple[str, str]]] = {
    "채소": [
        ("양파", "개"),
        ("대파", "단"),
        ("당근", "개"),
        ("감자", "개"),
        ("배추", "포기"),
    ],
    "과일": [("사과", "개"), ("바나나", "개"), ("딸기", "팩"), ("귤", "개")],
    "육류": [("삼겹살", "g"), ("닭가슴살", "g"), ("소고기 등심", "g"), ("다짐육", "g")],
    "수산물": [("고등어", "마리"), ("새우", "g"), ("오징어", "마리"), ("연어", "g")],
    "유제품": [("우유", "mL"), ("치즈", "장"), ("요거트", "개"), ("버터", "g")],
    "곡물": [("쌀", "kg"), ("밀가루", "g"), ("국수", "g"), ("식빵", "봉")],
    "조미료": [
        ("간장", "mL"),
        ("고추장", "g"),
        ("소금", "g"),
        ("설탕", "g"),
        ("참기름", "mL"),
    ],
    "음료": [("생수", "mL"), ("오렌지주스", "mL"), ("탄산수", "mL"), ("커피", "mL")],
}


async def seed(session: AsyncSession) -> None:
    for order, (category_name, foods) in enumerate(CATALOG.items(), start=1):
        category = (
            await session.execute(
                select(CategoryOrm).where(CategoryOrm.name == category_name)
            )
        ).scalar_one_or_none()

        if category is None:
            category = CategoryOrm(name=category_name, sort_order=order)
            session.add(category)
            await session.flush()  # id 를 얻기 위해

        for food_name, unit in foods:
            exists = (
                await session.execute(
                    select(FoodsOrm.id).where(
                        FoodsOrm.category_id == category.id,
                        FoodsOrm.name == food_name,
                    )
                )
            ).first()
            if exists is None:
                session.add(
                    FoodsOrm(
                        category_id=category.id,
                        name=food_name,
                        default_unit=unit,
                    )
                )

    await session.commit()


async def main() -> None:
    async with AsyncSession(engine) as session:
        await seed(session)
        categories = (await session.execute(select(CategoryOrm))).scalars().all()
        foods = (await session.execute(select(FoodsOrm))).scalars().all()
        print(f"categories: {len(categories)}")
        print(f"foods:      {len(foods)}")


if __name__ == "__main__":
    asyncio.run(main())
