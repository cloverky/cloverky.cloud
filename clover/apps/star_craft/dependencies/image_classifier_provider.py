import json
import os
from functools import lru_cache

from star_craft.adapter.outbound.torch.efficientnetv2s_gateway import (
    EfficientNetV2SGateway,
)
from star_craft.app.ports.input.image_classifier_use_case import (
    ImageClassifierUseCase,
)
from star_craft.app.ports.output.image_model_gateway import ImageModelGateway
from star_craft.app.use_cases.image_classifier_interactor import (
    ImageClassifierInteractor,
)

_CONFIDENCE_THRESHOLD = float(os.getenv("EFFICIENTNETV2S_CONFIDENCE_THRESHOLD", "0.7"))


@lru_cache(maxsize=1)
def _get_image_model_gateway() -> ImageModelGateway:
    # 모델 로딩 비용이 크므로 프로세스 생애주기 동안 한 번만 생성한다.
    return EfficientNetV2SGateway()


def _load_label_map() -> dict[int, str]:
    path = os.getenv("EFFICIENTNETV2S_LABEL_MAP_PATH")
    if not path or not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        raw: dict[str, str] = json.load(f)
    return {int(idx): label for idx, label in raw.items()}


def get_image_classifier_use_case() -> ImageClassifierUseCase:
    gateway = _get_image_model_gateway()
    label_map = _load_label_map()
    return ImageClassifierInteractor(
        gateway=gateway,
        label_map=label_map,
        confidence_threshold=_CONFIDENCE_THRESHOLD,
    )
