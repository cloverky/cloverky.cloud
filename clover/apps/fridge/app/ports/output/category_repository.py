from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.category_dto import CategoryItem


class CategoryRepository(ABC):
    @abstractmethod
    async def list_categories(self) -> list[CategoryItem]:
        pass
