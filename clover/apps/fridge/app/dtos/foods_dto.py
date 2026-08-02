from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FoodItem:
    id: int
    name: str
    category_id: int | None
    default_unit: str | None
