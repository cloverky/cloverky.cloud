from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class VectorHit:
    """Qdrant 검색 결과 한 건."""

    id: str
    score: float
    payload: dict[str, Any]


@dataclass(frozen=True)
class SearchCommand:
    """임베딩된 질의 벡터로 레시피 후보를 검색한다."""

    collection: str
    query_vector: list[float]
    top_k: int = 5


@dataclass(frozen=True)
class RecipeResult:
    """search_recipes가 반환하는 레시피 후보 한 건."""

    id: str
    name: str
    score: float
    payload: dict[str, Any]
