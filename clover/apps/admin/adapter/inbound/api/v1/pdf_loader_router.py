from admin.adapter.inbound.api.schemas.pdf_loader_schema import (
    PdfSummaryResponse,
    to_pdf_summary_response,
)
from admin.app.dtos.pdf_loader_dto import PdfUploadCommand
from admin.app.ports.input.pdf_loader_use_case import PdfLoaderUseCase
from admin.dependencies.pdf_loader_provider import get_pdf_loader_use_case
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

pdf_loader_router = APIRouter(prefix="/pdf", tags=["pdf"])

_MAX_UPLOAD_BYTES = 30 * 1024 * 1024


@pdf_loader_router.post("/summarize", summary="PDF 업로드 → 텍스트 추출 → 요약")
async def summarize_pdf(
    file: UploadFile = File(...),
    use_case: PdfLoaderUseCase = Depends(get_pdf_loader_use_case),
) -> PdfSummaryResponse:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="파일이 30MB를 초과합니다.")

    try:
        result = await use_case.summarize_pdf(
            PdfUploadCommand(filename=file.filename or "upload.pdf", content=content)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return to_pdf_summary_response(result)
