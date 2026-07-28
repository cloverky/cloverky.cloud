from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.image_classifier_dto import RawClassification


class ImageModelGateway(ABC):
    @abstractmethod
    async def classify(self, image_path: str, top_k: int) -> RawClassification:
        """이미지 경로를 받아 전처리·추론 후 Top-K 원본 결과를 반환한다."""
        pass
