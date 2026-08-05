from __future__ import annotations

from abc import ABC, abstractmethod


class ReceiptImageReaderPort(ABC):
    """S3 에 올라간 영수증 이미지를 읽어온다."""

    @abstractmethod
    async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
        """(이미지 바이트, content_type) 반환. 없으면 FileNotFoundError."""
