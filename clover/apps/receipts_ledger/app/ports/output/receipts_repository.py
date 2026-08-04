from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageUploadResult


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
