from dataclasses import dataclass


@dataclass(frozen=True)
class ReceiptQuery:
    user_id: int
    status: str


@dataclass(frozen=True)
class ReceiptUploadResponse:
    id: int
    status: str


@dataclass(frozen=True)
class ReceiptLineParsedDto:
    name: str
    quantity: int
    unit: str


@dataclass(frozen=True)
class ReceiptParseResultDto:
    store_name: str | None
    purchased_date: object  # datetime.date | None
    items: list
