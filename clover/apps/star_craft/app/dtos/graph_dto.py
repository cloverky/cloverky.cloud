from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RelationCommand:
    """식재료·레시피·카테고리 노드 한 쌍과 그 관계를 등록한다."""

    from_label: str
    from_props: dict[str, Any]
    to_label: str
    to_props: dict[str, Any]
    rel_type: str
