from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from star_craft.app.dtos.vector_dto import VectorHit


class VectorRepository(ABC):
    @abstractmethod
    async def upsert(
        self, collection: str, id: str, vector: list[float], payload: dict[str, Any]
    ) -> None:
        """collection에 벡터·payload 한 건을 upsert한다."""
        pass

    @abstractmethod
    async def search(
        self, collection: str, vector: list[float], top_k: int
    ) -> list[VectorHit]:
        """collection에서 vector와 가장 유사한 top_k건을 검색한다."""
        pass

    @abstractmethod
    async def delete(self, collection: str, id: str) -> None:
        """collection에서 id에 해당하는 포인트를 삭제한다."""
        pass
