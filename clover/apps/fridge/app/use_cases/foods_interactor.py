from __future__ import annotations

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository


class FoodsInteractor(FoodsUseCase):
    def __init__(self, repository: FoodsRepository) -> None:
        self.repository = repository

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        return await self.repository.list_foods(category_id)
