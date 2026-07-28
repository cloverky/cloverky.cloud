from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.pdf_loader_dto import PdfSummaryResult, PdfUploadCommand


class PdfLoaderUseCase(ABC):
    @abstractmethod
    async def summarize_pdf(self, command: PdfUploadCommand) -> PdfSummaryResult:
        """PDF를 추출·요약하고 그래프에 적재한 뒤 결과를 반환한다."""
        pass
