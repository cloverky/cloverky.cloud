from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class GameScoreOrm(Base):
    """사용자별 미니게임 최고 기록. (user_id, game) 하나당 한 줄만 유지한다."""

    __tablename__ = "game_scores"
    __table_args__ = (UniqueConstraint("user_id", "game", name="uq_game_scores_user_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    game: Mapped[str] = mapped_column(String, nullable=False)
    best_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    play_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
