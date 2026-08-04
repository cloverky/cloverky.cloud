from pydantic import BaseModel, Field
from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageUploadResult


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
