from __future__ import annotations

import asyncio
import os

import torch
from PIL import Image
from torchvision import transforms

from star_craft.app.dtos.image_classifier_dto import RawClassification
from star_craft.app.ports.output.image_model_gateway import ImageModelGateway

_MODEL_NAME = os.getenv("EFFICIENTNETV2S_MODEL_NAME", "tf_efficientnetv2_s")
_WEIGHTS_PATH = os.getenv("EFFICIENTNETV2S_WEIGHTS_PATH") or None
_NUM_CLASSES = int(os.getenv("EFFICIENTNETV2S_NUM_CLASSES", "1000"))
_INFERENCE_SIZE = 384

_INFERENCE_TRANSFORM = transforms.Compose(
    [
        transforms.Resize((_INFERENCE_SIZE, _INFERENCE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)


class EfficientNetV2SGateway(ImageModelGateway):
    """timm의 tf_efficientnetv2_s로 이미지를 분류하는 실제 구현체."""

    def __init__(
        self,
        model_name: str = _MODEL_NAME,
        num_classes: int = _NUM_CLASSES,
        weights_path: str | None = _WEIGHTS_PATH,
    ) -> None:
        import timm

        self._model = timm.create_model(
            model_name, pretrained=(weights_path is None), num_classes=num_classes
        )
        if weights_path:
            state_dict = torch.load(weights_path, map_location="cpu")
            self._model.load_state_dict(state_dict)
        self._model.eval()

    async def classify(self, image_path: str, top_k: int) -> RawClassification:
        return await asyncio.to_thread(self._classify_sync, image_path, top_k)

    def _classify_sync(self, image_path: str, top_k: int) -> RawClassification:
        image = Image.open(image_path).convert("RGB")
        tensor = _INFERENCE_TRANSFORM(image).unsqueeze(0)
        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=-1)
            top = torch.topk(probs, top_k)
        return RawClassification(
            indices=top.indices[0].tolist(),
            scores=top.values[0].tolist(),
        )
