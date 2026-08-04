from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.receipt_dto import ReceiptParseResultDto


class ReceiptOcrEnginePort(ABC):
    """영수증 이미지에서 구조화된 구매 정보를 뽑는다."""

    @abstractmethod
    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        """실패 시 ValueError — 인터랙터가 사용자 노출 메시지로 바꾼다."""
