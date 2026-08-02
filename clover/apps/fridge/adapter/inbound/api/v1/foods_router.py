from fastapi import APIRouter, Depends, Query

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.dependencies.foods_provider import get_foods_use_case

"""
식재료 카탈로그 (Foods Catalog)
AI가 인식한 식재료를 등록하고 관리하는 카탈로그.
카테고리 분류와 기본 단위를 보유하며, 인벤토리에 등록되는
식품 마스터 데이터 역할을 담당한다.
"""

foods_router = APIRouter(prefix="/food", tags=["food"])


@foods_router.get("/catalog")
async def get_catalog(
    category_id: int | None = Query(None, description="카테고리로 거르기"),
    food: FoodsUseCase = Depends(get_foods_use_case),
) -> list[FoodItem]:
    return await food.list_foods(category_id)
