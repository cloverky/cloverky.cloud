from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryItem:
    id: int
    name: str
    sort_order: int | None
