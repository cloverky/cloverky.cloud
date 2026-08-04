from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
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
