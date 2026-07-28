from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class GraphRepository(ABC):
    @abstractmethod
    async def upsert_node(self, label: str, props: dict[str, Any]) -> str:
        """label 노드를 name 기준으로 upsert하고 노드 id를 반환한다."""
        pass

    @abstractmethod
    async def upsert_relation(self, from_id: str, to_id: str, rel_type: str) -> None:
        """두 노드 사이에 rel_type 관계를 upsert한다."""
        pass

    @abstractmethod
    async def query(self, cypher: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        """임의의 Cypher 쿼리를 실행하고 레코드 목록을 반환한다."""
        pass
