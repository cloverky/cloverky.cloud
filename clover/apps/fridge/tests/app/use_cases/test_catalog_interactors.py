"""완료 기준: 인터랙터가 리포지토리 결과를 그대로 전달하는지 — DB 없이."""

from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository
from clover.apps.fridge.app.use_cases.category_interactor import CategoryInteractor
from clover.apps.fridge.app.use_cases.foods_interactor import FoodsInteractor

CATEGORIES = [
    CategoryItem(id=1, name="채소", sort_order=1),
    CategoryItem(id=2, name="과일", sort_order=2),
]


class FakeCategoryRepository(CategoryRepository):
    def __init__(self) -> None:
        self.calls = 0

    async def list_categories(self) -> list[CategoryItem]:
        self.calls += 1
        return CATEGORIES


async def test_category_list_is_passed_through() -> None:
    """리포지토리 결과를 그대로 돌려준다."""
    repository = FakeCategoryRepository()

    result = await CategoryInteractor(repository=repository).list_categories()

    assert repository.calls == 1
    assert [c.name for c in result] == ["채소", "과일"]


async def test_empty_category_list_is_not_an_error() -> None:
    """비어 있어도 빈 목록을 그대로 돌려준다."""

    class Empty(CategoryRepository):
        async def list_categories(self) -> list[CategoryItem]:
            return []

    assert await CategoryInteractor(repository=Empty()).list_categories() == []


FOODS = [
    FoodItem(id=1, name="양파", category_id=1, default_unit="개"),
    FoodItem(id=2, name="사과", category_id=2, default_unit="개"),
]


class FakeFoodsRepository(FoodsRepository):
    def __init__(self) -> None:
        self.seen: int | None | str = "unset"

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        self.seen = category_id
        return FOODS


async def test_food_list_passes_the_category_filter() -> None:
    """category_id 가 리포지토리까지 그대로 전달된다."""
    repository = FakeFoodsRepository()

    await FoodsInteractor(repository=repository).list_foods(category_id=2)

    assert repository.seen == 2


async def test_food_list_without_a_filter_passes_none() -> None:
    """필터가 없으면 None 이 전달된다 — 전체 조회다."""
    repository = FakeFoodsRepository()

    result = await FoodsInteractor(repository=repository).list_foods(category_id=None)

    assert repository.seen is None
    assert [f.name for f in result] == ["양파", "사과"]
