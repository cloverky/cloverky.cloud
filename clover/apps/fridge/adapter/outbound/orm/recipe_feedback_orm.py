from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class RecipeFeedbackOrm(Base):
    """추천 레시피에 남긴 좋아요·싫어요. (user_id, recipe_name) 하나당 한 줄만 유지한다.

    레시피는 추천할 때마다 생성되어 고정 ID 가 없다. 그래서 이름을 키로 쓴다.
    """

    __tablename__ = "recipe_feedback"
    __table_args__ = (
        UniqueConstraint("user_id", "recipe_name", name="uq_recipe_feedback_user_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    recipe_name: Mapped[str] = mapped_column(String, nullable=False)
    # "up" 또는 "down".
    verdict: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
