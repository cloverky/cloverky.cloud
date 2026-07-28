from __future__ import annotations

from star_craft.app.dtos.image_classifier_dto import ClassificationResult
from star_craft.app.ports.input.image_classifier_use_case import ImageClassifierUseCase
from star_craft.app.ports.output.image_model_gateway import ImageModelGateway
from star_craft.domain.value_objects.classification_result import interpret


class ImageClassifierInteractor(ImageClassifierUseCase):
    def __init__(
        self,
        gateway: ImageModelGateway,
        label_map: dict[int, str],
        confidence_threshold: float = 0.7,
    ) -> None:
        self._gateway = gateway
        self._label_map = label_map
        self._confidence_threshold = confidence_threshold

    async def classify(self, image_path: str, top_k: int = 5) -> ClassificationResult:
        raw = await self._gateway.classify(image_path, top_k)
        return interpret(raw, self._label_map, self._confidence_threshold)
