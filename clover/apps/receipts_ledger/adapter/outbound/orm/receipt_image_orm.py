from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ReceiptImageOrm(Base):
    __tablename__ = "receipt_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    s3_bucket: Mapped[str] = mapped_column(String, nullable=False)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    s3_url: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # OCR 이 읽어낸 내용. 스캔에 성공한 영수증만 채워지므로 전부 nullable 이다.
    # 목록 화면에서 사진과 함께 보여 주려고 이미지 레코드에 직접 붙인다.
    store_name: Mapped[str | None] = mapped_column(String, nullable=True)
    purchased_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # [{"name": "우유", "quantity": 2, "unit": "개"}, ...]
    parsed_items: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    parsed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
