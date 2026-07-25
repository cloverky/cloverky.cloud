from __future__ import annotations

import re
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from users.adapter.user import User, UserRole

from auth.app.dtos.auth_dto import AuthUserDto
from auth.app.ports.output.user_repository import UserRepository

_USERNAME_SANITIZE = re.compile(r"[^a-zA-Z0-9_]")


class UserPgRepository(UserRepository):
    """auth 게이트웨이 전용 포트 구현. `users` 테이블의 정본 ORM(users.adapter.user.User)을
    그대로 재사용한다 — 별도 UserOrm을 두지 않음(중복 방지)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> AuthUserDto | None:
        result = await self._session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        return self._to_dto(user) if user else None

    async def get_by_id(self, user_id: int) -> AuthUserDto | None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return self._to_dto(user) if user else None

    async def create_oauth_user(self, email: str, name: str) -> AuthUserDto:
        username = await self._unique_username(email)
        user = User(
            username=username,
            name=name,
            email=email,
            password_hash="",  # OAuth 전용 계정 — 비밀번호 로그인 불가
            role=UserRole.USER.value,
            agree_terms=True,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return self._to_dto(user)

    async def get_password_hash(self, email: str) -> str | None:
        result = await self._session.execute(
            select(User.password_hash).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def _unique_username(self, email: str) -> str:
        base = _USERNAME_SANITIZE.sub("", email.split("@")[0])[:16] or "user"
        candidate = base
        for _ in range(5):
            exists = await self._session.execute(
                select(User.id).where(User.username == candidate)
            )
            if exists.scalar_one_or_none() is None:
                return candidate
            candidate = f"{base[:12]}{secrets.token_hex(2)}"
        return f"{base[:12]}{secrets.token_hex(4)}"

    @staticmethod
    def _to_dto(user: User) -> AuthUserDto:
        return AuthUserDto(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            username=user.username,
        )
