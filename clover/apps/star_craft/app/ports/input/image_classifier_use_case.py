from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.image_classifier_dto import ClassificationResult


class ImageClassifierUseCase(ABC):
    @abstractmethod
    async def classify(self, image_path: str, top_k: int = 5) -> ClassificationResult:
        """이미지를 분류하고 레이블·신뢰도가 해석된 결과를 반환한다."""
        pass
