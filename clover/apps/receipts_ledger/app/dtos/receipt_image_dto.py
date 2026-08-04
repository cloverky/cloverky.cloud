from dataclasses import dataclass


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
