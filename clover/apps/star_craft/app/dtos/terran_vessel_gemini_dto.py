from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TerranVesselGeminiCommand:
    question: str


@dataclass(frozen=True)
class TerranVesselGeminiResultDto:
    answer: str
