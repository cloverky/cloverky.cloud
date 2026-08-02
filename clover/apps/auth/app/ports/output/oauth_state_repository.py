from __future__ import annotations

from abc import ABC, abstractmethod

from auth.app.dtos.auth_dto import AuthMode


class OAuthStateRepository(ABC):
    """OAuth CSRF state 발급/검증 포트.

    로그인·가입 의도(mode)를 state 값에 함께 싣는다. 의도는 소셜 동의 화면을
    거쳐 돌아오므로, 클라이언트가 바꿀 수 있는 곳(쿼리스트링·쿠키)에 두면
    가입 강제를 무력화할 수 있다.
    """

    @abstractmethod
    async def issue(self, mode: AuthMode) -> str:
        pass

    @abstractmethod
    async def consume(self, state: str) -> AuthMode | None:
        """state를 소진하고 실려 있던 mode를 돌려준다. 없거나 만료면 None."""
        pass
