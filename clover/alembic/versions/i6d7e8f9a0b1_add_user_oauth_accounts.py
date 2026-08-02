"""소셜 연동 기록 테이블 추가 + 기존 소셜 계정 백필

Revision ID: i6d7e8f9a0b1
Revises: h5c6d7e8f9a0
Create Date: 2026-08-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision: str = "i6d7e8f9a0b1"
down_revision: str | Sequence[str] | None = "h5c6d7e8f9a0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# 이 테이블이 생기기 전에 소셜 로그인으로 자동 생성된 계정들.
# provider_sub는 알 수 없으므로 NULL로 두고 첫 로그인 때 채운다.
_BACKFILL: tuple[tuple[str, str], ...] = (
    ("hisoyeon04@gmail.com", "google"),
    ("kakao_5002583421@kakao.local", "kakao"),
    ("soyeon8165@naver.com", "naver"),
)


def upgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "user_oauth_accounts" in tables:
        return
    op.create_table(
        "user_oauth_accounts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_sub", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_oauth_user_provider"),
        sa.UniqueConstraint(
            "provider", "provider_sub", name="uq_user_oauth_provider_sub"
        ),
    )
    op.create_index(
        "ix_user_oauth_accounts_user_id", "user_oauth_accounts", ["user_id"]
    )

    # 이메일로 조회해서 넣는다 — 해당 유저가 없는 환경에서는 0건이 들어가고 넘어간다.
    for email, provider in _BACKFILL:
        op.execute(
            sa.text(
                "INSERT INTO user_oauth_accounts (user_id, provider) "
                "SELECT id, :provider FROM users WHERE email = :email"
            ).bindparams(provider=provider, email=email)
        )


def downgrade() -> None:
    tables = set(inspect(op.get_bind()).get_table_names())
    if "user_oauth_accounts" not in tables:
        return
    op.drop_index("ix_user_oauth_accounts_user_id", table_name="user_oauth_accounts")
    op.drop_table("user_oauth_accounts")
