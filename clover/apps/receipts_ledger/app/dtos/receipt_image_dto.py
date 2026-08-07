from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass(frozen=True)
class ReceiptImageUploadCommand:
    user_email: str
    filename: str
    content: bytes
    content_type: str
    # 사용자가 붙인 이름. 비우면 올린 파일명을 그대로 쓴다.
    display_name: str | None = None


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
class ParsedItem:
    """영수증에서 읽어낸 품목 한 줄."""

    name: str
    quantity: int
    unit: str


@dataclass(frozen=True)
class ReceiptParseSaveCommand:
    """스캔에 성공한 영수증의 인식 결과를 이미지 레코드에 붙인다."""

    user_email: str
    s3_key: str
    store_name: str | None
    purchased_date: str | None
    items: list[ParsedItem]


@dataclass(frozen=True)
class ReceiptParseResult:
    """이미지에 저장된 OCR 결과. 스캔 전이면 parsed_at 이 None 이다."""

    store_name: str | None = None
    purchased_date: date | None = None
    items: list[ParsedItem] = field(default_factory=list)
    parsed_at: datetime | None = None


@dataclass(frozen=True)
class ReceiptImageDetail:
    """S3 에는 없고 DB 에만 있는 정보. 목록을 만들 때 S3 키로 붙인다."""

    display_name: str | None = None
    parsed: ReceiptParseResult | None = None


@dataclass(frozen=True)
class ReceiptImageListItem:
    """S3에 적재된 영수증 이미지 1건. view_url 은 만료되는 임시 열람 링크다."""

    key: str
    filename: str
    size_bytes: int
    uploaded_at: datetime
    view_url: str
    # S3 에는 이름도 인식 결과도 없다. 목록을 만들 때 DB 기록에서 채워 넣는다.
    display_name: str | None = None
    parsed: ReceiptParseResult | None = None
