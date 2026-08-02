from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.foods_dto import FoodItem


class FoodsRepository(ABC):
    @abstractmethod
    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        pass
