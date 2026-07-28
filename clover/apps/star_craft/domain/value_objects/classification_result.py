from __future__ import annotations

from star_craft.app.dtos.image_classifier_dto import (
    ClassificationResult,
    RawClassification,
)


def interpret(
    raw: RawClassification,
    label_map: dict[int, str],
    confidence_threshold: float,
) -> ClassificationResult:
    """원본 Top-K 결과에 레이블 매핑과 신뢰도 임계값 정책을 적용한다."""
    top_index = raw.indices[0]
    top_score = raw.scores[0]
    return ClassificationResult(
        label=label_map.get(top_index, "unknown"),
        confidence=round(top_score, 4),
        reliable=top_score >= confidence_threshold,
        alternatives=[
            {"label": label_map.get(idx, "unknown"), "score": round(score, 4)}
            for idx, score in zip(raw.indices[1:], raw.scores[1:], strict=True)
        ],
    )
