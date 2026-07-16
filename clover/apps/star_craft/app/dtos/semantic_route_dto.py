from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SemanticRouteCommand:
    question: str


@dataclass(frozen=True)
class SemanticRouteResultDto:
    destination: str
    entities: list[str]
