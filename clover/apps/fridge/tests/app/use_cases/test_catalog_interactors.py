"""완료 기준: 인터랙터가 리포지토리 결과를 그대로 전달하는지 — DB 없이."""

from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository
from clover.apps.fridge.app.use_cases.category_interactor import CategoryInteractor

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
