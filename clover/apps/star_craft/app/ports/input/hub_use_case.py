from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.graph_dto import RelationCommand
from star_craft.app.dtos.vector_dto import RecipeResult, SearchCommand


class HubUseCase(ABC):
    @abstractmethod
    async def register_ingredient_relation(self, cmd: RelationCommand) -> None:
        """스포크가 식재료·레시피·카테고리 관계를 허브(Graph DB)에 위임 등록한다."""
        pass

    @abstractmethod
    async def search_recipes(self, cmd: SearchCommand) -> list[RecipeResult]:
        """임박 재료 임베딩 기반으로 레시피 후보를 검색한다 (Vector DB)."""
        pass
