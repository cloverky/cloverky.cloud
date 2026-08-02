from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.input.category_use_case import CategoryUseCase
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository


class CategoryInteractor(CategoryUseCase):
    def __init__(self, repository: CategoryRepository) -> None:
        self.repository = repository

    async def list_categories(self) -> list[CategoryItem]:
        return await self.repository.list_categories()
