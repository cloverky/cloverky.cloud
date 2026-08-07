from datetime import date, datetime

from pydantic import BaseModel, Field
from receipts_ledger.app.dtos.receipt_image_dto import (
    ParsedItem,
    ReceiptImageListItem,
    ReceiptImageUploadResult,
    ReceiptParseSaveCommand,
)


class ReceiptImageUploadResponse(BaseModel):
    id: int = Field(..., description="영수증 이미지 업로드 기록 ID")
    s3_bucket: str = Field(..., description="저장된 S3 버킷명")
    s3_key: str = Field(..., description="S3 오브젝트 키")
    s3_url: str = Field(..., description="업로드된 이미지의 S3 URL")
    status: str = Field(..., description="처리 상태")


def to_receipt_image_upload_response(
    result: ReceiptImageUploadResult,
) -> ReceiptImageUploadResponse:
    return ReceiptImageUploadResponse(
        id=result.id,
        s3_bucket=result.s3_bucket,
        s3_key=result.s3_key,
        s3_url=result.s3_url,
        status=result.status,
    )


class ParsedItemSchema(BaseModel):
    name: str = Field(..., description="품목명")
    quantity: int = Field(..., description="수량")
    unit: str = Field(..., description="단위")


class ReceiptParseSchema(BaseModel):
    """영수증에서 읽어낸 내용. 아직 스캔하지 않은 영수증은 null 이다."""

    store_name: str | None = Field(None, description="가게명")
    purchased_date: date | None = Field(None, description="구매일")
    items: list[ParsedItemSchema] = Field(default_factory=list, description="품목 목록")
    parsed_at: datetime | None = Field(None, description="인식 시각")


class ReceiptImageItemResponse(BaseModel):
    key: str = Field(..., description="S3 오브젝트 키")
    filename: str = Field(..., description="파일명")
    size_bytes: int = Field(..., description="파일 크기(바이트)")
    uploaded_at: datetime = Field(..., description="S3 적재 시각")
    view_url: str = Field(..., description="임시 열람 링크(1시간 후 만료)")
    parsed: ReceiptParseSchema | None = Field(None, description="OCR 인식 결과")


class ReceiptImageListResponse(BaseModel):
    items: list[ReceiptImageItemResponse] = Field(
        ..., description="영수증 목록(최신순)"
    )
    total: int = Field(..., description="영수증 건수")


def to_receipt_image_list_response(
    items: list[ReceiptImageListItem],
) -> ReceiptImageListResponse:
    return ReceiptImageListResponse(
        items=[
            ReceiptImageItemResponse(
                key=i.key,
                filename=i.filename,
                size_bytes=i.size_bytes,
                uploaded_at=i.uploaded_at,
                view_url=i.view_url,
                parsed=(
                    ReceiptParseSchema(
                        store_name=i.parsed.store_name,
                        purchased_date=i.parsed.purchased_date,
                        items=[
                            ParsedItemSchema(
                                name=p.name, quantity=p.quantity, unit=p.unit
                            )
                            for p in i.parsed.items
                        ],
                        parsed_at=i.parsed.parsed_at,
                    )
                    if i.parsed
                    else None
                ),
            )
            for i in items
        ],
        total=len(items),
    )


class ReceiptParseSaveRequest(BaseModel):
    s3_key: str = Field(..., description="인식 결과를 붙일 영수증의 S3 키")
    store_name: str | None = Field(None, description="가게명")
    purchased_date: str | None = Field(None, description="구매일 (YYYY-MM-DD)")
    items: list[ParsedItemSchema] = Field(
        default_factory=list, description="인식된 품목 목록"
    )


def to_receipt_parse_save_command(
    user_email: str, request: ReceiptParseSaveRequest
) -> ReceiptParseSaveCommand:
    return ReceiptParseSaveCommand(
        user_email=user_email,
        s3_key=request.s3_key,
        store_name=request.store_name,
        purchased_date=request.purchased_date,
        items=[
            ParsedItem(name=i.name, quantity=i.quantity, unit=i.unit)
            for i in request.items
        ],
    )
