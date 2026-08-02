"""완료 기준: 라우터가 목록을 돌려주고 category_id 를 유스케이스에 넘기는지."""

from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.category_use_case import CategoryUseCase
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.dependencies.category_provider import get_category_use_case
from clover.apps.fridge.dependencies.foods_provider import get_foods_use_case
from fastapi import FastAPI
from fastapi.testclient import TestClient

# 라우터는 main.py 와 같은 fridge. 경로로 임포트한다. 경로를 섞으면 라우터가
# 끌어오는 ORM 이 두 이름으로 로드된다.
from fridge.adapter.inbound.api.v1.category_router import category_router
from fridge.adapter.inbound.api.v1.foods_router import foods_router


class StubCategories(CategoryUseCase):
    async def list_categories(self) -> list[CategoryItem]:
        return [CategoryItem(id=1, name="채소", sort_order=1)]


class SpyFoods(FoodsUseCase):
    def __init__(self) -> None:
        self.seen: int | None | str = "unset"

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        self.seen = category_id
        return [FoodItem(id=1, name="양파", category_id=1, default_unit="개")]


def build_client(foods: FoodsUseCase) -> TestClient:
    app = FastAPI()
    app.include_router(category_router)
    app.include_router(foods_router)
    app.dependency_overrides[get_category_use_case] = lambda: StubCategories()
    app.dependency_overrides[get_foods_use_case] = lambda: foods
    return TestClient(app)


def test_category_list_returns_an_array() -> None:
    """카테고리는 배열로 나온다."""
    response = build_client(SpyFoods()).get("/category/list")

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "채소", "sort_order": 1}]


def test_food_catalog_passes_the_category_filter() -> None:
    """category_id 가 유스케이스까지 전달된다."""
    spy = SpyFoods()
    response = build_client(spy).get("/food/catalog", params={"category_id": 3})

    assert response.status_code == 200
    assert spy.seen == 3


def test_food_catalog_without_a_filter() -> None:
    """필터가 없으면 None 이 전달된다."""
    spy = SpyFoods()
    response = build_client(spy).get("/food/catalog")

    assert response.status_code == 200
    assert spy.seen is None
