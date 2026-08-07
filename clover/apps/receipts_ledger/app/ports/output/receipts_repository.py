from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageUploadResult,
    ReceiptParseResult,
    ReceiptParseSaveCommand,
)


class ReceiptsRepository(ABC):
    @abstractmethod
    async def create(
        self, user_email: str, s3_bucket: str, s3_key: str, s3_url: str
    ) -> ReceiptImageUploadResult:
        """업로드된 영수증 이미지의 위치를 기록하고 저장된 레코드를 반환한다."""
        pass

    @abstractmethod
    async def find_keys_by_user_email(self, user_email: str) -> list[str]:
        """해당 회원이 업로드한 영수증의 S3 키 목록을 반환한다."""
        pass

    @abstractmethod
    async def find_parse_results_by_user_email(
        self, user_email: str
    ) -> dict[str, ReceiptParseResult]:
        """해당 회원 영수증의 OCR 결과를 S3 키로 찾을 수 있게 반환한다."""
        pass

    @abstractmethod
    async def save_parse_result(self, command: ReceiptParseSaveCommand) -> bool:
        """인식 결과를 해당 영수증에 기록한다. 소유자의 영수증이 아니면 False."""
        pass

    @abstractmethod
    async def delete_by_key(self, user_email: str, s3_key: str) -> bool:
        """해당 회원의 영수증 기록을 지운다. 소유자의 영수증이 아니면 False."""
        pass
