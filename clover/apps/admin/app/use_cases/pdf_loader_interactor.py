from __future__ import annotations

from admin.app.dtos.pdf_loader_dto import (
    PdfDocumentRecord,
    PdfSummaryResult,
    PdfUploadCommand,
)
from admin.app.ports.input.pdf_loader_use_case import PdfLoaderUseCase
from admin.app.ports.output.pdf_document_port import PdfDocumentPort
from admin.app.ports.output.pdf_extractor_port import PdfExtractorPort
from admin.app.ports.output.pdf_summarizer_port import PdfSummarizerPort
from admin.app.use_cases._pdf_chunk import preview_of, split_text

# 한 번에 요약 요청으로 보낼 최대 문자 수. 초과분은 분할 요약 후 다시 요약한다.
_CHUNK_SIZE = 6000


class PdfLoaderInteractor(PdfLoaderUseCase):
    """업로드 → 텍스트 추출 → 요약 → 그래프 적재 오케스트레이션."""

    def __init__(
        self,
        extractor: PdfExtractorPort,
        summarizer: PdfSummarizerPort,
        documents: PdfDocumentPort,
        chunk_size: int = _CHUNK_SIZE,
    ) -> None:
        self.extractor = extractor
        self.summarizer = summarizer
        self.documents = documents
        self.chunk_size = chunk_size

    async def summarize_pdf(self, command: PdfUploadCommand) -> PdfSummaryResult:
        loaded = await self.extractor.extract(command.filename, command.content)
        if not loaded.text.strip():
            raise ValueError(
                "PDF에서 추출된 텍스트가 없습니다. (스캔 이미지 PDF 여부 확인)"
            )

        summary = await self._summarize(loaded.text)

        node_id = await self.documents.save(
            PdfDocumentRecord(
                uid=loaded.uid,
                filename=loaded.filename,
                summary=summary,
                char_count=len(loaded.text),
            )
        )

        return PdfSummaryResult(
            uid=loaded.uid,
            filename=loaded.filename,
            summary=summary,
            char_count=len(loaded.text),
            node_id=node_id,
            preview=preview_of(loaded.text),
        )

    async def _summarize(self, text: str) -> str:
        """map-reduce 요약 — 청크별 요약 후 그 요약들을 다시 요약한다."""
        chunks = split_text(text, self.chunk_size)
        if len(chunks) == 1:
            return await self.summarizer.summarize(chunks[0])

        partials = [await self.summarizer.summarize(chunk) for chunk in chunks]
        return await self.summarizer.summarize("\n\n".join(partials))
