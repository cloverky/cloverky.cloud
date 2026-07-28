from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RawClassification:
    """모델 추론 원본 결과 (Top-K 인덱스·확률)."""

    indices: list[int]
    scores: list[float]


@dataclass(frozen=True)
class ClassificationResult:
    """레이블 매핑·신뢰도 임계값이 적용된 최종 분류 결과."""

    label: str
    confidence: float
    reliable: bool
    alternatives: list[dict[str, object]] = field(default_factory=list)
