import pytest

from star_craft.app.dtos.image_classifier_dto import RawClassification
from star_craft.app.ports.output.image_model_gateway import ImageModelGateway
from star_craft.app.use_cases.image_classifier_interactor import (
    ImageClassifierInteractor,
)

_LABEL_MAP = {i: f"class_{i}" for i in range(10)}


class _FakeImageModelGateway(ImageModelGateway):
    """실제 모델 없이 고정된 Top-K 결과를 반환하는 테스트용 대역."""

    async def classify(self, image_path: str, top_k: int) -> RawClassification:
        scores = [0.9, 0.05, 0.02, 0.02, 0.01][:top_k]
        return RawClassification(indices=list(range(len(scores))), scores=scores)


@pytest.mark.asyncio
async def test_classify_returns_reliable_top_label():
    interactor = ImageClassifierInteractor(
        gateway=_FakeImageModelGateway(),
        label_map=_LABEL_MAP,
        confidence_threshold=0.7,
    )

    result = await interactor.classify("dummy.jpg", top_k=5)

    assert result.label == "class_0"
    assert result.reliable is True
    assert len(result.alternatives) == 4
