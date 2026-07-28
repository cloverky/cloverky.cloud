from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from star_craft.app.ports.input.image_classifier_use_case import (
    ImageClassifierUseCase,
)
from star_craft.dependencies.image_classifier_provider import (
    get_image_classifier_use_case,
)

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}

image_classifier_router = APIRouter(
    prefix="/image-classifier", tags=["image-classifier"]
)


@image_classifier_router.post("/classify")
async def classify_image(
    file: UploadFile = File(...),
    top_k: int = 5,
    use_case: ImageClassifierUseCase = Depends(get_image_classifier_use_case),
) -> dict[str, object]:
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported content_type: {file.content_type}",
        )

    content = await file.read()
    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = await use_case.classify(tmp_path, top_k=top_k)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return {
        "label": result.label,
        "confidence": result.confidence,
        "reliable": result.reliable,
        "alternatives": result.alternatives,
    }
