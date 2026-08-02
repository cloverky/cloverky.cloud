from datetime import datetime

from database import Base
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from users.adapter.entity_id import EntityIdMixin


class UserOAuthAccount(EntityIdMixin, Base):
    """소셜 연동 기록 — 이 계정이 어떤 provider로 가입했는지.

    행은 가입할 때만 생긴다. 행이 없으면 그 provider로 로그인할 수 없다.
    """

    __tablename__ = "user_oauth_accounts"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_oauth_user_provider"),
        UniqueConstraint("provider", "provider_sub", name="uq_user_oauth_provider_sub"),
    )

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    # 마이그레이션으로 백필한 기존 계정은 소셜측 고유 ID를 알 수 없다 — 첫 로그인 때 채운다.
    provider_sub: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
