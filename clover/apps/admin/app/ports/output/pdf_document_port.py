from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.pdf_loader_dto import PdfDocumentRecord


class PdfDocumentPort(ABC):
    @abstractmethod
    async def save(self, record: PdfDocumentRecord) -> str:
        """문서를 저장소에 upsert하고 식별자를 반환한다."""
        pass
