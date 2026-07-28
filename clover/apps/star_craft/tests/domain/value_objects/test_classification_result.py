from star_craft.app.dtos.image_classifier_dto import RawClassification
from star_craft.domain.value_objects.classification_result import interpret

_LABEL_MAP = {i: f"class_{i}" for i in range(10)}


def test_interpret_marks_reliable_above_threshold():
    raw = RawClassification(
        indices=[0, 1, 2, 3, 4], scores=[0.9, 0.05, 0.02, 0.02, 0.01]
    )

    result = interpret(raw, _LABEL_MAP, confidence_threshold=0.7)

    assert result.label == "class_0"
    assert result.confidence == 0.9
    assert result.reliable is True
    assert len(result.alternatives) == 4
    assert result.alternatives[0] == {"label": "class_1", "score": 0.05}


def test_interpret_marks_unreliable_below_threshold():
    raw = RawClassification(indices=[0, 1], scores=[0.4, 0.3])

    result = interpret(raw, _LABEL_MAP, confidence_threshold=0.7)

    assert result.reliable is False


def test_interpret_unknown_label_for_unmapped_index():
    raw = RawClassification(indices=[999], scores=[0.5])

    result = interpret(raw, _LABEL_MAP, confidence_threshold=0.7)

    assert result.label == "unknown"
