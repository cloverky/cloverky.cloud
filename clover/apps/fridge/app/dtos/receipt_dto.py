from dataclasses import dataclass


@dataclass(frozen=True)
class ReceiptQuery:
    user_id: int
    status: str


@dataclass(frozen=True)
class ReceiptUploadResponse:
    id: int
    status: str
