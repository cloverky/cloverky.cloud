from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ReceiptImageUploadCommand:
    user_email: str
    filename: str
    content: bytes
    content_type: str


@dataclass(frozen=True)
class ReceiptImageStorageResult:
    bucket: str
    key: str
    url: str


@dataclass(frozen=True)
class ReceiptImageUploadResult:
    id: int
    s3_bucket: str
    s3_key: str
    s3_url: str
    status: str


@dataclass(frozen=True)
class ReceiptImageListItem:
    """S3에 적재된 영수증 이미지 1건. view_url 은 만료되는 임시 열람 링크다."""

    key: str
    filename: str
    size_bytes: int
    uploaded_at: datetime
    view_url: str
