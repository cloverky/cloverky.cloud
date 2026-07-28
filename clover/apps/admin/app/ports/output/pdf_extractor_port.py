from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.pdf_loader_dto import LoadedPdf


class PdfExtractorPort(ABC):
    @abstractmethod
    async def extract(self, filename: str, content: bytes) -> LoadedPdf:
        """PDF 바이트에서 텍스트를 추출한다. 파싱 실패 시 ValueError."""
        pass
