# 소셜 로그인 사전가입 강제 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소셜 로그인은 그 provider로 가입한 계정만 통과시키고, 미가입자는 "등록되지 않은 계정" 안내와 함께 회원가입 창으로 보낸다.

**Architecture:** `user_oauth_accounts` 테이블에 연동 기록을 남기고, 로그인·가입 의도를 Redis state 값에 실어 소셜 왕복 동안 서버가 붙들고 있는다. `handle_callback` 은 `provider_sub` 로 연동 기록을 찾아, 없으면 login 모드에서 거부하고 signup 모드에서만 계정을 만든다. 거부는 예외가 아니라 프론트 콜백 경로로 가는 에러 리다이렉트로 표현한다.

**Tech Stack:** FastAPI · SQLAlchemy 2.0 (async) · Alembic · Redis · Next.js 15 (App Router) · TypeScript

설계 문서: `_docs/social-login-preregistration-design.md`

## Global Constraints

- 작업 저장소는 **WSL 클론** `/home/soyeon/projects/cloverky.cloud` 다. Windows 클론에서 고쳐도 배포에 반영되지 않는다.
- 브랜치는 **`soyeon`**. 새 브랜치를 만들지 않는다. 전부 끝나면 `main` 으로 머지한다.
- 백엔드 검사는 `clover/.venv` 로 돌린다. 캐시가 root 소유라 **`ruff --no-cache`**, **`mypy --cache-dir=/tmp/...`** 가 필수다.
- `pytest.ini` 의 `testpaths` 가 `apps/titanic/tests` 라 **auth 테스트는 경로를 명시**해야 한다.
- 새 예외는 **`ValueError` 를 상속하지 않는다.** 라우터가 `ValueError` 를 400 으로 바꾸고 있어 섞이면 구분이 안 된다.
- 프론트 `tsc --noEmit` 은 **기존 에러 12개**(`components/feature-page.tsx` 7, `components/inventory-feature-page.tsx` 4, `app/vision/page.tsx` 1)를 안고 있다. 게이트는 "12개 유지 + 우리가 건드린 파일에 에러 0" 이다.
- 소셜 계정 실제 로그인(카카오·네이버·구글 자격증명 입력)은 **사용자만 할 수 있다.** 자동화가 대신 하지 않는다.

### 표준 검사 명령

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/auth/tests -q
```

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && .venv/bin/ruff check --no-cache apps/auth
```

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && MYPYPATH=apps .venv/bin/mypy -p auth --cache-dir=/tmp/mypy-auth
```

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npx tsc --noEmit
```

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npm run lint
```

**시작 시점 베이스라인:** pytest 22 passed · ruff 통과 · mypy 46 files 통과 · lint 통과 · tsc 에러 12개.

---

## 파일 구조

| 파일 | 책임 | 작업 |
|---|---|---|
| `clover/apps/users/adapter/user_oauth_account.py` | 연동 기록 ORM | 생성 (Task 1) |
| `clover/alembic/versions/i6d7e8f9a0b1_add_user_oauth_accounts.py` | 테이블 생성 + 기존 3계정 백필 | 생성 (Task 1) |
| `clover/apps/auth/app/dtos/auth_dto.py` | `AuthMode`, `OAuthLinkDto`, 예외 2개 추가 | 수정 (Task 2) |
| `clover/apps/auth/app/ports/output/oauth_state_repository.py` | state에 mode를 싣는 포트 | 수정 (Task 2) |
| `clover/apps/auth/app/ports/output/user_repository.py` | 연동 조회·생성 포트 | 수정 (Task 2) |
| `clover/apps/auth/app/ports/input/auth_use_case.py` | `start_login` 시그니처 | 수정 (Task 2) |
| `clover/apps/auth/adapter/outbound/redis/oauth_state_store.py` | mode 저장, GETDEL 원자 소진 | 수정 (Task 2) |
| `clover/apps/auth/adapter/outbound/repositories/user_pg_repository.py` | 연동 조회·생성 PG 구현 | 수정 (Task 2) |
| `clover/apps/auth/app/use_cases/auth_interactor.py` | 사전가입 강제 분기 | 수정 (Task 2) |
| `clover/apps/auth/tests/app/use_cases/test_auth_interactor.py` | 분기 7케이스 + 기존 테스트 갱신 | 수정 (Task 2) |
| `clover/apps/auth/adapter/inbound/api/auth_router.py` | `/auth/signup/{provider}` + 에러 리다이렉트 | 수정 (Task 3) |
| `clover/apps/auth/tests/adapter/test_auth_router.py` | 라우터 3케이스 + 스텁 갱신 | 수정 (Task 3) |
| `clover/main.py` | 레거시 라우터 mount 해제 | 수정 (Task 4) |
| `clover/apps/secom/adapter/inbound/api/v1/oauth_router.py` | 우회로 | 삭제 (Task 4) |
| `lucky/app/oauth/callback/page.tsx` | `error` 파라미터 분기 | 수정 (Task 5) |
| `lucky/components/social-login-buttons.tsx` | `mode` prop, `onError` prop | 수정 (Task 5) |
| `lucky/components/sign-up-dialog-context.tsx` | `SignUpPrefill` 인자 | 수정 (Task 6) |
| `lucky/components/app-shell.tsx` | `signUpPrefill` 상태 배선 | 수정 (Task 6) |
| `lucky/components/login-dialog.tsx` | `not_registered` → 회원가입 모달 전환 | 수정 (Task 6) |
| `lucky/components/signup-dialog.tsx` | 안내 배너 + 프리필 + signup 모드 버튼 | 수정 (Task 6) |

---

## Task 1: 연동 기록 테이블과 백필

**Files:**
- Create: `clover/apps/users/adapter/user_oauth_account.py`
- Create: `clover/alembic/versions/i6d7e8f9a0b1_add_user_oauth_accounts.py`

**Interfaces:**
- Consumes: `users.adapter.entity_id.EntityIdMixin`, `database.Base` (`clover/apps/database.py`)
- Produces: 테이블 `user_oauth_accounts` — 컬럼 `id, user_id, provider, provider_sub, created_at`. 제약 `uq_user_oauth_user_provider(user_id, provider)`, `uq_user_oauth_provider_sub(provider, provider_sub)`. ORM 클래스 `UserOAuthAccount`.

- [ ] **Step 1: ORM 모델 작성**

`clover/apps/users/adapter/user_oauth_account.py`:

```python
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
```

- [ ] **Step 2: 마이그레이션 작성**

`clover/alembic/versions/i6d7e8f9a0b1_add_user_oauth_accounts.py`:

```python
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
```

- [ ] **Step 3: 마이그레이션 적용**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && DATABASE_URL='postgresql+psycopg_async://cloverky:aacloverky04@localhost:5432/cloverky' .venv/bin/alembic upgrade head
```

Expected: `Running upgrade h5c6d7e8f9a0 -> i6d7e8f9a0b1`

- [ ] **Step 4: 백필 결과 확인**

```bash
docker exec cloverkycloud-pgvector-1 psql -U cloverky -d cloverky -c "select l.user_id, u.email, l.provider, l.provider_sub from user_oauth_accounts l join users u on u.id = l.user_id order by l.user_id;"
```

Expected: 정확히 3행. `2 | hisoyeon04@gmail.com | google |`, `3 | kakao_5002583421@kakao.local | kakao |`, `4 | soyeon8165@naver.com | naver |`. `provider_sub` 는 모두 비어 있다(NULL). `a@a`(id 1) 는 없어야 한다 — 비밀번호 계정이라 소셜 연동이 없다.

- [ ] **Step 5: downgrade 왕복 확인**

**이 단계는 반드시 Task 7(배포) 전에 끝내야 한다.** downgrade가 테이블을 잠깐 없애는데, 새 코드가 이미 떠 있으면 그 사이 소셜 로그인이 전부 500으로 죽는다. 배포 후에는 이 명령을 돌리지 않는다.

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && export DATABASE_URL='postgresql+psycopg_async://cloverky:aacloverky04@localhost:5432/cloverky' && .venv/bin/alembic downgrade -1 && .venv/bin/alembic upgrade head && .venv/bin/alembic current
```

Expected: 마지막 줄이 `i6d7e8f9a0b1 (head)`. 그 뒤 Step 4의 psql 을 다시 돌려 3행이 그대로 복구됐는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add clover/apps/users/adapter/user_oauth_account.py clover/alembic/versions/i6d7e8f9a0b1_add_user_oauth_accounts.py && git commit -m "feat(auth): add the user_oauth_accounts table and backfill existing social users

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: 사전가입 강제 로직

**Files:**
- Modify: `clover/apps/auth/app/dtos/auth_dto.py`
- Modify: `clover/apps/auth/app/ports/output/oauth_state_repository.py`
- Modify: `clover/apps/auth/app/ports/output/user_repository.py`
- Modify: `clover/apps/auth/app/ports/input/auth_use_case.py`
- Modify: `clover/apps/auth/adapter/outbound/redis/oauth_state_store.py`
- Modify: `clover/apps/auth/adapter/outbound/repositories/user_pg_repository.py`
- Modify: `clover/apps/auth/app/use_cases/auth_interactor.py`
- Test: `clover/apps/auth/tests/app/use_cases/test_auth_interactor.py`

**Interfaces:**
- Consumes: Task 1의 `UserOAuthAccount` ORM
- Produces:
  - `AuthMode = Literal["login", "signup"]`
  - `OAuthLinkDto(user_id: int, provider: str, provider_sub: str | None)`
  - `NotRegisteredError(provider: str, email: str, name: str)` — 속성 `.provider .email .name`
  - `EmailAlreadyRegisteredError(provider: str, email: str)` — 속성 `.provider .email`
  - `AuthUseCase.start_login(provider: str, mode: AuthMode = "login") -> StartLoginResult`
  - `OAuthStateRepository.issue(mode: AuthMode) -> str` / `consume(state: str) -> AuthMode | None`
  - `UserRepository.find_link(provider, provider_sub) -> OAuthLinkDto | None`
  - `UserRepository.claim_backfilled_link(provider, email, provider_sub) -> OAuthLinkDto | None`
  - `UserRepository.create_link(user_id, provider, provider_sub) -> OAuthLinkDto`

- [ ] **Step 1: DTO와 예외 추가**

`clover/apps/auth/app/dtos/auth_dto.py` — 파일 상단 import에 `from typing import Literal` 을 더하고, `ProviderIdentity` 정의 **위**에 다음을 넣는다.

```python
AuthMode = Literal["login", "signup"]
```

그리고 파일 맨 끝에 다음을 붙인다.

```python
@dataclass(frozen=True)
class OAuthLinkDto:
    """어떤 유저가 어떤 provider로 가입했는지. 이 기록이 있어야 그 provider로 로그인할 수 있다."""

    user_id: int
    provider: str
    provider_sub: str | None


class NotRegisteredError(Exception):
    """그 provider로 가입한 적 없는 소셜 계정이 로그인을 시도했다.

    ValueError를 상속하지 않는다 — 라우터가 ValueError를 400으로 바꾸고 있어
    상속하면 에러 리다이렉트로 분기할 수 없다.
    """

    def __init__(self, provider: str, email: str, name: str) -> None:
        super().__init__("등록되지 않은 계정입니다.")
        self.provider = provider
        self.email = email
        self.name = name


class EmailAlreadyRegisteredError(Exception):
    """소셜 가입을 시도했지만 그 이메일이 이미 다른 방법으로 가입돼 있다."""

    def __init__(self, provider: str, email: str) -> None:
        super().__init__("이미 가입된 이메일입니다.")
        self.provider = provider
        self.email = email
```

- [ ] **Step 2: 포트 시그니처 변경**

`clover/apps/auth/app/ports/output/oauth_state_repository.py` 전체를 다음으로 바꾼다.

```python
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
```

`clover/apps/auth/app/ports/output/user_repository.py` 의 import를 `from auth.app.dtos.auth_dto import AuthUserDto, OAuthLinkDto` 로 바꾸고, 클래스 끝에 다음 세 메서드를 더한다.

```python
    @abstractmethod
    async def find_link(self, provider: str, provider_sub: str) -> OAuthLinkDto | None:
        """provider_sub로 연동 기록을 찾는다.

        이메일이 아니라 provider_sub로 찾는다 — 이메일은 바뀔 수 있고, 카카오는
        이메일 제공이 선택이라 kakao_{id}@kakao.local 폴백이 쓰인다.
        """
        pass

    @abstractmethod
    async def claim_backfilled_link(
        self, provider: str, email: str, provider_sub: str
    ) -> OAuthLinkDto | None:
        """provider_sub가 비어 있는 백필 행을 이메일로 찾아 sub를 채우고 돌려준다.

        마이그레이션으로 넣은 기존 계정은 소셜측 고유 ID를 알 수 없다.
        계정당 첫 로그인 때 한 번만 성사된다.
        """
        pass

    @abstractmethod
    async def create_link(
        self, user_id: int, provider: str, provider_sub: str
    ) -> OAuthLinkDto:
        pass
```

`clover/apps/auth/app/ports/input/auth_use_case.py` 의 import에 `AuthMode` 를 더하고 `start_login` 을 바꾼다.

```python
    @abstractmethod
    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        pass
```

- [ ] **Step 3: 테스트의 가짜 구현을 새 포트에 맞춘다**

`clover/apps/auth/tests/app/use_cases/test_auth_interactor.py` 의 import 블록을 다음으로 바꾼다.

```python
from auth.app.dtos.auth_dto import (
    AuthMode,
    AuthUserDto,
    CallbackCommand,
    EmailAlreadyRegisteredError,
    NotRegisteredError,
    OAuthLinkDto,
    PasswordLoginCommand,
    ProviderIdentity,
    RefreshCommand,
)
```

`FakeStateStore` 를 통째로 바꾼다.

```python
class FakeStateStore(OAuthStateRepository):
    def __init__(self) -> None:
        self.issued: dict[str, AuthMode] = {}
        self._count = 0

    async def issue(self, mode: AuthMode) -> str:
        state = f"state-{self._count}"
        self._count += 1
        self.issued[state] = mode
        return state

    async def consume(self, state: str) -> AuthMode | None:
        return self.issued.pop(state, None)
```

`FakeUserRepository.__init__` 에 `self.links: list[OAuthLinkDto] = []` 를 더하고, 클래스 끝에 다음을 붙인다.

```python
    async def find_link(self, provider: str, provider_sub: str) -> OAuthLinkDto | None:
        return next(
            (
                link
                for link in self.links
                if link.provider == provider and link.provider_sub == provider_sub
            ),
            None,
        )

    async def claim_backfilled_link(
        self, provider: str, email: str, provider_sub: str
    ) -> OAuthLinkDto | None:
        user = await self.get_by_email(email)
        if user is None:
            return None
        for i, link in enumerate(self.links):
            if (
                link.provider == provider
                and link.provider_sub is None
                and link.user_id == user.id
            ):
                claimed = OAuthLinkDto(
                    user_id=link.user_id, provider=provider, provider_sub=provider_sub
                )
                self.links[i] = claimed
                return claimed
        return None

    async def create_link(
        self, user_id: int, provider: str, provider_sub: str
    ) -> OAuthLinkDto:
        link = OAuthLinkDto(
            user_id=user_id, provider=provider, provider_sub=provider_sub
        )
        self.links.append(link)
        return link

    def add_backfilled_link(self, user_id: int, provider: str) -> None:
        """마이그레이션 백필과 같은 상태 — provider_sub가 아직 비어 있는 연동 기록."""
        self.links.append(
            OAuthLinkDto(user_id=user_id, provider=provider, provider_sub=None)
        )
```

- [ ] **Step 4: 새 동작을 검증하는 테스트 7개를 쓴다**

같은 파일의 `test_callback_rejects_unknown_provider` **뒤**에 붙인다. `FakeGoogleGateway` 는 항상 `provider_sub="g-1"`, `email="tester@example.com"`, `name="Tester"` 를 돌려준다는 점을 이용한다.

```python
async def test_login_rejects_unlinked_social_account(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """가입한 적 없는 소셜 계정은 로그인할 수 없다 — 계정도 만들어지지 않는다."""
    auth, users, _ = interactor
    start = await auth.start_login("google")

    with pytest.raises(NotRegisteredError) as exc:
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )

    assert exc.value.provider == "google"
    assert exc.value.email == "tester@example.com"
    assert exc.value.name == "Tester"
    assert users.rows == {}


async def test_login_rejects_account_linked_to_another_provider(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """카카오로 가입한 계정은 같은 이메일이어도 구글로 로그인할 수 없다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "kakao", "k-1")
    start = await auth.start_login("google")

    with pytest.raises(NotRegisteredError):
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )


async def test_login_accepts_linked_account(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "google", "g-1")
    start = await auth.start_login("google")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.access_token and pair.refresh_token
    assert pair.email == "tester@example.com"
    assert pair.is_new_user is False
    assert len(tokens.live) == 1


async def test_login_claims_backfilled_link_and_fills_sub(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """마이그레이션으로 백필된 계정은 첫 로그인에서 통과하고 provider_sub가 채워진다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    users.add_backfilled_link(user.id, "google")
    start = await auth.start_login("google")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is False
    assert users.links == [
        OAuthLinkDto(user_id=user.id, provider="google", provider_sub="g-1")
    ]


async def test_signup_creates_user_and_link(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    start = await auth.start_login("google", mode="signup")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is True
    assert pair.email == "tester@example.com"
    assert len(users.rows) == 1
    assert users.links == [
        OAuthLinkDto(user_id=1, provider="google", provider_sub="g-1")
    ]
    assert len(tokens.live) == 1


async def test_signup_rejects_email_registered_by_another_method(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """비밀번호로 이미 가입한 이메일은 소셜 가입으로 가로챌 수 없다."""
    auth, users, _ = interactor
    users.add_password_user("tester@example.com", "tester", hash_password("supersecret1"))
    start = await auth.start_login("google", mode="signup")

    with pytest.raises(EmailAlreadyRegisteredError) as exc:
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )

    assert exc.value.email == "tester@example.com"
    assert users.links == []


async def test_signup_on_already_linked_account_just_logs_in(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """이미 가입된 사람이 가입 버튼을 눌러도 계정이 늘어나지 않는다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "google", "g-1")
    start = await auth.start_login("google", mode="signup")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is False
    assert len(users.rows) == 1
    assert len(users.links) == 1
```

- [ ] **Step 5: 기존 테스트 5개를 새 계약에 맞춘다**

같은 파일에서 다음을 고친다. 소셜 콜백이 더는 계정을 만들지 않으므로, 세션을 만들어야 하는 테스트는 **가입 모드**로 시작해야 한다.

`test_callback_creates_user_and_issues_pair` 와 `test_callback_marks_returning_user_as_not_new` 는 Step 4의 `test_signup_creates_user_and_link` · `test_login_accepts_linked_account` 가 더 정확하게 대체하므로 **두 함수를 삭제한다.**

`test_refresh_rotates_token` · `test_refresh_reuse_revokes_every_session` · `test_logout_revokes_sessions_and_blacklists_access_token` 세 함수에서, 각각의

```python
    start = await auth.start_login("google")
```

를 다음으로 바꾼다.

```python
    start = await auth.start_login("google", mode="signup")
```

- [ ] **Step 6: 테스트를 돌려 실패를 확인한다**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/auth/tests -q
```

Expected: FAIL. `TypeError: issue() missing 1 required positional argument: 'mode'` 또는 `TypeError: start_login() got an unexpected keyword argument 'mode'` 계열 — 인터랙터가 아직 새 포트를 쓰지 않는다.

- [ ] **Step 7: Redis state store를 mode에 맞춘다**

`clover/apps/auth/adapter/outbound/redis/oauth_state_store.py` 전체를 다음으로 바꾼다.

```python
from __future__ import annotations

import os
import secrets
from typing import cast

import redis.asyncio as redis

from auth.app.dtos.auth_dto import AuthMode
from auth.app.ports.output.oauth_state_repository import OAuthStateRepository

_TTL_SECONDS = 300


class RedisOAuthStateStore(OAuthStateRepository):
    def __init__(self, redis_url: str | None = None) -> None:
        # 모듈 로드 시점 상수가 아니라 생성 시점에 읽는다 — 상수로 두면 테스트에서 바꿀 수 없다.
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://redis:6379/0")

    async def issue(self, mode: AuthMode) -> str:
        state = secrets.token_urlsafe(24)
        client: redis.Redis = redis.from_url(self._redis_url, decode_responses=True)
        try:
            await client.set(f"auth:state:{state}", mode, ex=_TTL_SECONDS)
        finally:
            await client.aclose()
        return state

    async def consume(self, state: str) -> AuthMode | None:
        client: redis.Redis = redis.from_url(self._redis_url, decode_responses=True)
        try:
            # GETDEL은 원자적이다. GET + DELETE로 나누면 동시에 도착한 두 콜백이
            # 같은 state로 모두 통과할 수 있다.
            value = await client.getdel(f"auth:state:{state}")
        finally:
            await client.aclose()
        if value in ("login", "signup"):
            return cast(AuthMode, value)
        return None
```

- [ ] **Step 8: PG 리포지토리에 연동 조회·생성을 구현한다**

`clover/apps/auth/adapter/outbound/repositories/user_pg_repository.py` 의 import 블록을 다음으로 바꾼다.

```python
from __future__ import annotations

import re
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from users.adapter.user import User, UserRole
from users.adapter.user_oauth_account import UserOAuthAccount

from auth.app.dtos.auth_dto import AuthUserDto, OAuthLinkDto
from auth.app.ports.output.user_repository import UserRepository
```

그리고 `_unique_username` **위**에 다음 세 메서드를 넣는다.

```python
    async def find_link(self, provider: str, provider_sub: str) -> OAuthLinkDto | None:
        result = await self._session.execute(
            select(UserOAuthAccount).where(
                UserOAuthAccount.provider == provider,
                UserOAuthAccount.provider_sub == provider_sub,
            )
        )
        row = result.scalar_one_or_none()
        return self._to_link_dto(row) if row else None

    async def claim_backfilled_link(
        self, provider: str, email: str, provider_sub: str
    ) -> OAuthLinkDto | None:
        result = await self._session.execute(
            select(UserOAuthAccount)
            .join(User, User.id == UserOAuthAccount.user_id)
            .where(
                UserOAuthAccount.provider == provider,
                UserOAuthAccount.provider_sub.is_(None),
                User.email == email,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        row.provider_sub = provider_sub
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_link_dto(row)

    async def create_link(
        self, user_id: int, provider: str, provider_sub: str
    ) -> OAuthLinkDto:
        row = UserOAuthAccount(
            user_id=user_id, provider=provider, provider_sub=provider_sub
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_link_dto(row)
```

마지막으로 `_to_dto` 아래에 변환 헬퍼를 더한다.

```python
    @staticmethod
    def _to_link_dto(row: UserOAuthAccount) -> OAuthLinkDto:
        return OAuthLinkDto(
            user_id=row.user_id, provider=row.provider, provider_sub=row.provider_sub
        )
```

- [ ] **Step 9: 인터랙터에 분기를 넣는다**

`clover/apps/auth/app/use_cases/auth_interactor.py` 의 DTO import를 다음으로 바꾼다.

```python
from auth.app.dtos.auth_dto import (
    AuthMode,
    CallbackCommand,
    EmailAlreadyRegisteredError,
    NotRegisteredError,
    PasswordLoginCommand,
    RefreshCommand,
    StartLoginResult,
    TokenPairDto,
)
```

`start_login` 을 바꾼다.

```python
    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        # provider 검증을 state 발급보다 먼저 한다 — 잘못된 provider 요청이
        # Redis에 고아 state를 남기지 않게.
        gateway = self._provider(provider)
        state = await self._states.issue(mode)
        return StartLoginResult(
            authorize_url=gateway.build_authorize_url(state), state=state
        )
```

`handle_callback` 을 통째로 바꾼다.

```python
    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        """소셜 콜백 — 연동 기록이 있는 계정만 통과한다.

        가입은 signup 모드로 시작한 흐름에서만 일어난다. login 모드에서 계정을
        자동 생성하면 소셜 버튼 한 번으로 누구나 회원이 되기 때문이다.
        """
        mode = await self._states.consume(cmd.state)
        if mode is None:
            raise ValueError("유효하지 않거나 만료된 state 입니다.")

        identity = await self._provider(cmd.provider).exchange_code(cmd.code)

        link = await self._users.find_link(cmd.provider, identity.provider_sub)
        if link is None:
            link = await self._users.claim_backfilled_link(
                cmd.provider, identity.email, identity.provider_sub
            )

        if link is not None:
            user = await self._users.get_by_id(link.user_id)
            if user is None:
                raise ValueError("사용자를 찾을 수 없습니다.")
            return await self._issue_pair(
                sub=str(user.id),
                roles=[user.role],
                name=user.name,
                email=user.email,
                username=user.username,
            )

        if mode == "login":
            raise NotRegisteredError(
                provider=cmd.provider, email=identity.email, name=identity.name
            )

        if await self._users.get_by_email(identity.email) is not None:
            raise EmailAlreadyRegisteredError(
                provider=cmd.provider, email=identity.email
            )

        user = await self._users.create_oauth_user(identity.email, identity.name)
        await self._users.create_link(user.id, cmd.provider, identity.provider_sub)
        return await self._issue_pair(
            sub=str(user.id),
            roles=[user.role],
            name=user.name,
            email=user.email,
            username=user.username,
            is_new_user=True,
        )
```

- [ ] **Step 10: 테스트 통과 확인**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/auth/tests -q
```

Expected: PASS. 테스트 수는 22 − 2(삭제) + 7(추가) = **27 passed**.

- [ ] **Step 11: ruff · mypy**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && .venv/bin/ruff check --no-cache apps/auth && MYPYPATH=apps .venv/bin/mypy -p auth --cache-dir=/tmp/mypy-auth
```

Expected: `All checks passed!` 그리고 `Success: no issues found`.

- [ ] **Step 12: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add clover/apps/auth && git commit -m "feat(auth): require a matching provider link before social login

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: 가입 진입점과 에러 리다이렉트

**Files:**
- Modify: `clover/apps/auth/adapter/inbound/api/auth_router.py`
- Test: `clover/apps/auth/tests/adapter/test_auth_router.py`

**Interfaces:**
- Consumes: Task 2의 `NotRegisteredError`, `EmailAlreadyRegisteredError`, `start_login(provider, mode)`
- Produces: `GET /auth/signup/{provider}` → 302. 콜백 실패 시 `{FRONTEND_URL}/oauth/callback?error=<code>&provider=&email=&name=` 로 303. 에러 코드는 `not_registered` / `email_taken`.

- [ ] **Step 1: 실패하는 라우터 테스트를 쓴다**

`clover/apps/auth/tests/adapter/test_auth_router.py` 의 DTO import에 `AuthMode`, `EmailAlreadyRegisteredError`, `NotRegisteredError` 를 더한다. 그리고 `StubAuthUseCase.start_login` 과 `_CallbackStub.start_login` 의 시그니처를 새 계약에 맞춘다.

```python
    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        if provider != "google":
            raise ValueError(f"지원하지 않는 provider: {provider}")
        return StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")
```

(`_CallbackStub.start_login` 도 같은 시그니처로 바꾸되, provider 검증 없이 `StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")` 만 돌려주는 기존 본문을 유지한다.)

파일 끝에 다음을 붙인다.

```python
class _RaisingStub(AuthUseCase):
    """콜백이 예외를 던질 때 라우터가 무엇으로 바꾸는지 검증하기 위한 스텁."""

    def __init__(self, error: Exception) -> None:
        self._error = error

    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        return StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")

    async def login_with_password(self, cmd: PasswordLoginCommand) -> TokenPairDto:
        raise NotImplementedError

    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        raise self._error

    async def refresh(self, cmd: RefreshCommand) -> TokenPairDto:
        raise NotImplementedError

    async def logout(self, refresh_token: str, access_jti: str | None) -> None:
        raise NotImplementedError


def _client_raising(error: Exception) -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth")
    app.dependency_overrides[get_auth_use_case] = lambda: _RaisingStub(error)
    return TestClient(app)


def test_signup_redirect_sends_browser_to_provider(client: TestClient) -> None:
    res = client.get("/auth/signup/google", follow_redirects=False)

    assert res.status_code == 302
    assert res.headers["location"] == _AUTHORIZE_URL


def test_callback_redirects_unregistered_user_with_error() -> None:
    error = NotRegisteredError(
        provider="kakao", email="new@example.com", name="새 사용자"
    )
    res = _client_raising(error).get(
        "/auth/callback/kakao?code=c&state=s", follow_redirects=False
    )

    assert res.status_code == 303
    location = res.headers["location"]
    assert location.startswith("https://cloverky.cloud/oauth/callback?")
    assert "error=not_registered" in location
    assert "provider=kakao" in location
    assert "email=new%40example.com" in location


def test_error_redirect_carries_no_token() -> None:
    """거부된 흐름에 토큰이 새 나가면 안 된다 — 쿼리에도 쿠키에도."""
    error = EmailAlreadyRegisteredError(provider="google", email="taken@example.com")
    res = _client_raising(error).get(
        "/auth/callback/google?code=c&state=s", follow_redirects=False
    )

    assert res.status_code == 303
    assert "error=email_taken" in res.headers["location"]
    assert "token=" not in res.headers["location"]
    assert "access_token" not in res.cookies
    assert "refresh_token" not in res.cookies
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/auth/tests/adapter -q
```

Expected: FAIL — `/auth/signup/google` 이 404, 그리고 콜백 예외가 리다이렉트로 바뀌지 않는다.

- [ ] **Step 3: 라우터에 가입 진입점과 에러 리다이렉트를 넣는다**

`clover/apps/auth/adapter/inbound/api/auth_router.py` 의 DTO import에 `EmailAlreadyRegisteredError` 와 `NotRegisteredError` 를 더한다.

`_build_frontend_redirect` **아래**에 다음을 넣는다.

```python
def _build_error_redirect(error: str, provider: str, email: str, name: str) -> str:
    """실패도 프론트 콜백 경로로 되돌린다.

    콜백은 팝업 안 브라우저다 — 여기서 401 JSON을 던지면 사용자가 raw JSON을
    보게 된다. 토큰은 쿼리에도 쿠키에도 싣지 않는다.
    """
    query = (
        f"?error={quote(error)}"
        f"&provider={quote(provider)}"
        f"&email={quote(email)}"
        f"&name={quote(name)}"
    )
    return f"{_FRONTEND_URL}/oauth/callback{query}"
```

`login_redirect` **아래**에 가입 진입점을 넣는다.

```python
@auth_router.get("/signup/{provider}", response_model=None)
async def signup_redirect(
    provider: str,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> RedirectResponse:
    """소셜 회원가입 진입점 — 여기서 시작한 흐름만 새 계정을 만들 수 있다."""
    try:
        result = await auth.start_login(provider, mode="signup")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    return RedirectResponse(url=result.authorize_url, status_code=302)
```

`callback` 의 `try/except` 를 다음으로 바꾼다.

```python
    try:
        pair = await auth.handle_callback(
            CallbackCommand(provider=provider, code=code, state=state)
        )
    except NotRegisteredError as e:
        return RedirectResponse(
            url=_build_error_redirect("not_registered", e.provider, e.email, e.name),
            status_code=303,
        )
    except EmailAlreadyRegisteredError as e:
        return RedirectResponse(
            url=_build_error_redirect("email_taken", e.provider, e.email, ""),
            status_code=303,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
```

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/auth/tests -q
```

Expected: PASS, **30 passed** (Task 2의 27 + 3).

- [ ] **Step 5: ruff · mypy**

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && .venv/bin/ruff check --no-cache apps/auth && MYPYPATH=apps .venv/bin/mypy -p auth --cache-dir=/tmp/mypy-auth
```

Expected: 둘 다 통과.

- [ ] **Step 6: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add clover/apps/auth && git commit -m "feat(auth): add the social signup entrypoint and error redirect

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: 레거시 소셜 라우터 제거

**Files:**
- Modify: `clover/main.py:55`, `clover/main.py:343`
- Delete: `clover/apps/secom/adapter/inbound/api/v1/oauth_router.py`

**Interfaces:**
- Produces: `api.cloverky.cloud/auth/{google,kakao,naver}` 경로가 사라진다. 소셜 인증 경로는 auth 게이트웨이 하나만 남는다.

- [ ] **Step 1: mount 해제**

`clover/main.py` 에서 다음 두 줄을 지운다.

```python
from secom.adapter.inbound.api.v1.oauth_router import oauth_router
```

```python
app.include_router(oauth_router)
```

- [ ] **Step 2: 파일 삭제**

```bash
cd /home/soyeon/projects/cloverky.cloud && git rm clover/apps/secom/adapter/inbound/api/v1/oauth_router.py
```

- [ ] **Step 3: 남은 참조가 없는지 확인**

```bash
cd /home/soyeon/projects/cloverky.cloud && grep -rn "oauth_router" --include="*.py" clover/ | grep -v __pycache__
```

Expected: 출력 없음.

- [ ] **Step 4: 컨테이너에서 import가 되는지 확인**

`import main` 은 로컬 venv로는 불가능하다(의존성이 이미지에만 있다). 이미지를 **빌드만** 하고 일회용 컨테이너로 확인한다. 라이브 backend 컨테이너를 먼저 교체하면 실패 시 API가 죽는다.

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && docker compose build backend && docker compose run --rm --no-deps backend python -c "import clover.main; print('import ok')"
```

Expected: 마지막 줄에 `import ok`. 그 앞의 `titanic 라우터 로드 실패 — … No module named 'pandas'` 경고 6줄은 기존 현상이다 — 선택 의존성이 `requirements-docker.txt` 에 없어서 나며 앱이 잡아서 흘려보낸다. 이 작업과 무관하다.

- [ ] **Step 5: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add clover/main.py && git commit -m "refactor(secom): drop the legacy oauth router that bypassed signup

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: 프론트 — 콜백 에러 분기와 소셜 버튼 모드

**Files:**
- Modify: `lucky/app/oauth/callback/page.tsx`
- Modify: `lucky/components/social-login-buttons.tsx`

**Interfaces:**
- Consumes: Task 3의 에러 리다이렉트 쿼리 계약
- Produces:
  - `SocialLoginButtons` props — `{ onClose: () => void; mode: 'login' | 'signup'; onError?: (reason: OAuthErrorReason, detail: OAuthErrorDetail) => void }`
  - `export type OAuthErrorReason = 'not_registered' | 'email_taken' | 'unknown'`
  - `export type OAuthErrorDetail = { provider: string; email: string; name: string }`

- [ ] **Step 1: 콜백 페이지에 에러 분기를 넣는다**

`lucky/app/oauth/callback/page.tsx` 의 `useEffect` 본문 **맨 앞**에 다음을 넣는다.

```tsx
    const error = params.get('error');
    if (error) {
      // 가입 강제에 걸린 흐름 — 토큰이 없다. 오프너가 안내를 띄우게 넘긴다.
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'oauth_error',
            reason: error,
            provider: params.get('provider') ?? '',
            email: params.get('email') ?? '',
            name: params.get('name') ?? '',
          },
          window.location.origin,
        );
        window.close();
      } else {
        router.replace('/');
      }
      return;
    }
```

기존 `const token = params.get('token');` 이하는 그대로 둔다.

- [ ] **Step 2: 소셜 버튼에 mode와 onError를 넣는다**

`lucky/components/social-login-buttons.tsx` 의 상단(`'use client';` 와 `useAuth` import 아래)을 다음으로 바꾼다. 레거시 라우터가 Task 4에서 사라졌으므로 `GATEWAY_PROVIDERS` 분기도 함께 없앤다.

```tsx
export type OAuthErrorReason = 'not_registered' | 'email_taken' | 'unknown';

export type OAuthErrorDetail = {
  provider: string;
  email: string;
  name: string;
};

interface Props {
  onClose: () => void;
  /** 'login'은 기존 연동 계정만 통과시킨다. 새 계정은 'signup'에서만 만들어진다. */
  mode: 'login' | 'signup';
  onError?: (reason: OAuthErrorReason, detail: OAuthErrorDetail) => void;
}

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.cloverky.cloud';

const KNOWN_REASONS = new Set<string>(['not_registered', 'email_taken']);

export function SocialLoginButtons({ onClose, mode, onError }: Props) {
  const { login } = useAuth();

  const handleSocialLogin = (provider: string) => {
    const url = `${AUTH_BASE}/auth/${mode}/${provider}`;
    const w = 480, h = 600;
```

이어지는 `const left = ...` 부터 `const popup = window.open(url, ...)` 까지는 그대로 둔다.

그리고 `onMsg` 안에서 `oauth_done` 블록 **뒤**에 다음을 더한다.

```tsx
      if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', onMsg);
        const raw = String(e.data.reason ?? '');
        // 서버가 나중에 새 에러를 추가해도 사용자가 빈 화면을 보지 않게 한다.
        const reason: OAuthErrorReason = KNOWN_REASONS.has(raw)
          ? (raw as OAuthErrorReason)
          : 'unknown';
        onError?.(reason, {
          provider: String(e.data.provider ?? ''),
          email: String(e.data.email ?? ''),
          name: String(e.data.name ?? ''),
        });
      }
```

- [ ] **Step 3: 두 호출부에 mode를 준다**

`lucky/components/login-dialog.tsx:277` 을 바꾼다.

```tsx
        <SocialLoginButtons mode="login" onClose={() => onOpenChange(false)} />
```

`lucky/components/signup-dialog.tsx` 의 `<SocialLoginButtons onClose={...} />` 를 찾아 바꾼다.

```tsx
        <SocialLoginButtons mode="signup" onClose={() => onOpenChange(false)} />
```

(`onError` 배선은 Task 6에서 붙인다 — 이 단계에서는 타입이 맞는 것까지만 확인한다.)

- [ ] **Step 4: 타입체크와 린트**

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npx tsc --noEmit 2>&1 | tee /tmp/tsc-t5.txt | grep -c "error TS"
```

Expected: `12` (기존 에러 그대로). 그리고 다음이 아무것도 출력하지 않아야 한다.

```bash
grep -E "login-dialog|signup-dialog|social-login-buttons|oauth/callback" /tmp/tsc-t5.txt
```

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npm run lint
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add lucky/app/oauth/callback/page.tsx lucky/components/social-login-buttons.tsx lucky/components/login-dialog.tsx lucky/components/signup-dialog.tsx && git commit -m "feat(lucky): split the social buttons into login and signup modes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 프론트 — 미가입 안내와 회원가입 모달 전환

**Files:**
- Modify: `lucky/components/sign-up-dialog-context.tsx`
- Modify: `lucky/components/app-shell.tsx`
- Modify: `lucky/components/login-dialog.tsx`
- Modify: `lucky/components/signup-dialog.tsx`

**Interfaces:**
- Consumes: Task 5의 `OAuthErrorReason`, `OAuthErrorDetail`
- Produces: `export type SignUpPrefill = { email?: string; name?: string; notice?: string }` — `useOpenSignUp()` 이 `(prefill?: SignUpPrefill) => void` 를 돌려준다. `SignUpDialog` 가 `prefill?: SignUpPrefill` prop 을 받는다.

- [ ] **Step 1: context가 프리필을 받게 한다**

`lucky/components/sign-up-dialog-context.tsx` 전체를 다음으로 바꾼다.

```tsx
"use client";

import { createContext, useContext } from "react";

export type SignUpPrefill = {
  email?: string;
  name?: string;
  /** 회원가입 모달 상단에 띄울 안내 — 미가입 소셜 로그인에서 넘어온 경우 등. */
  notice?: string;
};

const OpenSignUpContext = createContext<((prefill?: SignUpPrefill) => void) | null>(
  null,
);

export function OpenSignUpProvider({
  open,
  children,
}: {
  open: (prefill?: SignUpPrefill) => void;
  children: React.ReactNode;
}) {
  return (
    <OpenSignUpContext.Provider value={open}>{children}</OpenSignUpContext.Provider>
  );
}

export function useOpenSignUp() {
  const ctx = useContext(OpenSignUpContext);
  return ctx ?? (() => {});
}
```

- [ ] **Step 2: app-shell에 프리필 상태를 배선한다**

`lucky/components/app-shell.tsx` 의 import에 타입을 더한다.

```tsx
import { OpenSignUpProvider, type SignUpPrefill } from "@/components/sign-up-dialog-context";
```

`AuthDialogsState` 와 초기값에 `signUpPrefill` 을 더한다.

```tsx
type AuthDialogsState = {
  signUpOpen: boolean;
  signUpPrefill: SignUpPrefill;
  loginOpen: boolean;
  loginPrefillEmail: string;
  profileEditOpen: boolean;
};

const INITIAL_AUTH_DIALOGS: AuthDialogsState = {
  signUpOpen: false,
  signUpPrefill: {},
  loginOpen: false,
  loginPrefillEmail: "",
  profileEditOpen: false,
};
```

`openSignUp` 을 바꾼다.

```tsx
  const openSignUp = useCallback(
    (prefill: SignUpPrefill = {}) =>
      patchDialogs({ signUpOpen: true, signUpPrefill: prefill }),
    [],
  );
```

`<SignUpDialog ...>` 에 prop을 더한다.

```tsx
              <SignUpDialog
                open={dialogs.signUpOpen}
                prefill={dialogs.signUpPrefill}
                onOpenChange={(signUpOpen) => patchDialogs({ signUpOpen })}
                onOpenLogin={(email) => {
                  patchDialogs({
                    signUpOpen: false,
                    loginPrefillEmail: email ?? "",
                    loginOpen: true,
                  });
                }}
              />
```

- [ ] **Step 3: 회원가입 모달이 프리필과 안내를 받게 한다**

`lucky/components/signup-dialog.tsx` 를 다음처럼 고친다.

import에 `useEffect` 와 타입, 그리고 소셜 에러 타입을 더한다.

```tsx
import { useEffect, useState } from "react";
import type { SignUpPrefill } from "@/components/sign-up-dialog-context";
import {
  SocialLoginButtons,
  type OAuthErrorDetail,
  type OAuthErrorReason,
} from "@/components/social-login-buttons";
```

props와 상태를 넓힌다.

```tsx
interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLogin?: (email?: string) => void;
  prefill?: SignUpPrefill;
}
```

`SignUpState` 에 `notice: string | null;` 을 더하고, `INITIAL_SIGNUP_STATE` 에 `notice: null,` 을 더한다.

컴포넌트 시그니처와 프리필 적용 효과를 넣는다. `patchForm` 정의 **아래**에 둔다.

```tsx
export function SignUpDialog({
  open,
  onOpenChange,
  onOpenLogin,
  prefill,
}: SignUpDialogProps) {
```

```tsx
  useEffect(() => {
    if (!open || !prefill) return;
    // 모달이 열릴 때만 1회 적용한다 — 이후 사용자가 편집하는 폼 상태를 덮어쓰지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchForm({
      email: prefill.email ?? "",
      name: prefill.name ?? "",
      notice: prefill.notice ?? null,
    });
  }, [open, prefill]);
```

안내 배너를 폼 맨 위(첫 `<div className="space-y-2">` 바로 앞)에 넣는다.

```tsx
          {form.notice && (
            <div
              className="rounded-lg border border-accent/40 bg-accent/10 p-3"
              role="status"
            >
              <p className="text-sm text-foreground">{form.notice}</p>
            </div>
          )}
```

마지막으로 소셜 버튼에 에러 처리를 붙인다.

```tsx
        <SocialLoginButtons
          mode="signup"
          onClose={() => onOpenChange(false)}
          onError={(reason: OAuthErrorReason, _detail: OAuthErrorDetail) => {
            patchForm({
              error:
                reason === "email_taken"
                  ? "이미 가입된 이메일입니다. 가입할 때 사용한 방법으로 로그인해 주세요."
                  : "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            });
          }}
        />
```

- [ ] **Step 4: 로그인 모달이 미가입을 회원가입으로 넘긴다**

`lucky/components/login-dialog.tsx` 의 소셜 버튼 import를 바꾼다.

```tsx
import {
  SocialLoginButtons,
  type OAuthErrorDetail,
  type OAuthErrorReason,
} from "@/components/social-login-buttons";
```

`DEMO_PASSWORD` 상수 아래에 다음을 더한다.

```tsx
const PROVIDER_LABEL: Record<string, string> = {
  google: "구글",
  kakao: "카카오",
  naver: "네이버",
};

/** 카카오는 이메일 제공이 선택이라 kakao_{id}@kakao.local 같은 가짜 주소가 온다 — 폼에 넣지 않는다. */
const isRealEmail = (email: string) => Boolean(email) && !email.endsWith(".local");
```

`<SocialLoginButtons mode="login" onClose={...} />` 를 다음으로 바꾼다.

```tsx
        <SocialLoginButtons
          mode="login"
          onClose={() => onOpenChange(false)}
          onError={(reason: OAuthErrorReason, detail: OAuthErrorDetail) => {
            if (reason !== "not_registered") {
              patchForm({
                error: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
              });
              return;
            }
            const label = PROVIDER_LABEL[detail.provider] ?? "소셜";
            onOpenChange(false);
            resetForm();
            openSignUp({
              email: isRealEmail(detail.email) ? detail.email : undefined,
              name: detail.name || undefined,
              notice: `등록되지 않은 계정입니다. ${label} 계정으로 먼저 회원가입해 주세요.`,
            });
          }}
        />
```

- [ ] **Step 5: 타입체크와 린트**

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npx tsc --noEmit 2>&1 | tee /tmp/tsc-t6.txt | grep -c "error TS"
```

Expected: `12`.

```bash
grep -E "login-dialog|signup-dialog|social-login-buttons|app-shell|sign-up-dialog-context" /tmp/tsc-t6.txt
```

Expected: 출력 없음.

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npm run lint
```

Expected: 에러 없음.

- [ ] **Step 6: 프로덕션 빌드가 되는지 확인**

Vercel이 빌드하므로 여기서 깨지면 배포가 실패한다.

```bash
export NVM_DIR=$HOME/.nvm && . $NVM_DIR/nvm.sh && cd /home/soyeon/projects/cloverky.cloud/lucky && npm run build 2>&1 | tail -20
```

Expected: `Compiled successfully` 이후 라우트 목록이 출력된다.

- [ ] **Step 7: 커밋**

```bash
cd /home/soyeon/projects/cloverky.cloud && git add lucky/components && git commit -m "feat(lucky): send unregistered social logins to the signup dialog

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: 배포와 검증

**Files:** 없음 — 운영 작업.

**Interfaces:**
- Consumes: Task 1~6 전부

- [ ] **Step 1: `soyeon` 을 `main` 으로 머지하고 push**

프론트는 Vercel이 `main` 에서 빌드한다. 머지해야 배포가 시작된다.

```bash
cd /home/soyeon/projects/cloverky.cloud && git checkout main && git merge --no-ff soyeon -m "feat: require pre-registration for social login" && git push origin main && git checkout soyeon && git merge --ff-only main && git push origin soyeon
```

Expected: push 두 번 모두 성공.

- [ ] **Step 2: auth · backend 컨테이너 교체**

마이그레이션은 Task 1에서 이미 적용됐다(`alembic current` 가 `i6d7e8f9a0b1`). 이미지를 먼저 빌드하고, import 확인이 끝난 뒤에 교체한다.

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && docker compose build auth backend && docker compose run --rm --no-deps auth python -c "import clover.auth_main; print('auth import ok')"
```

Expected: `auth import ok`.

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && docker compose up -d auth backend && docker compose ps auth backend
```

Expected: 둘 다 `Up`.

- [ ] **Step 3: 진입점이 살아 있는지 확인**

```bash
curl -s -o /dev/null -w "login:%{http_code} " "https://auth.cloverky.cloud/auth/login/kakao" ; curl -s -o /dev/null -w "signup:%{http_code}\n" "https://auth.cloverky.cloud/auth/signup/kakao"
```

Expected: `login:302 signup:302`.

- [ ] **Step 4: 기존 API가 죽지 않았는지 확인**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://api.cloverky.cloud/docs"
```

Expected: `200`. 레거시 라우터 제거로 backend가 죽지 않았음을 확인한다.

- [ ] **Step 5: 레거시 경로가 사라졌는지 확인**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://api.cloverky.cloud/auth/kakao"
```

Expected: `404`.

- [ ] **Step 6: 사용자 확인 요청**

소셜 자격증명 입력은 자동화가 대신하지 않는다. 사용자에게 다음 네 가지를 직접 확인해 달라고 요청한다.

1. **미가입 소셜로 로그인** — 로그인 모달에서 가입한 적 없는 카카오/구글 계정으로 시도. 팝업이 닫히고 회원가입 모달이 "등록되지 않은 계정입니다. …" 배너와 함께 뜨는지.
2. **소셜 가입** — 회원가입 모달의 같은 버튼으로 가입. 동의 화면을 거쳐 로그인 상태가 되는지.
3. **가입한 소셜로 재로그인** — 로그인 모달에서 방금 가입한 계정으로. 바로 들어가지는지.
4. **기존 계정** — `hisoyeon04@gmail.com`(구글) 로 로그인. 백필 덕에 그대로 들어가지는지. 들어간 뒤 아래로 `provider_sub` 가 채워졌는지 확인한다.

```bash
docker exec cloverkycloud-pgvector-1 psql -U cloverky -d cloverky -c "select u.email, l.provider, l.provider_sub from user_oauth_accounts l join users u on u.id = l.user_id order by l.user_id;"
```

Expected: `hisoyeon04@gmail.com | google | <구글 고유 ID>` — NULL이 아니어야 한다.

---

## 롤백

문제가 생기면 역순으로 되돌린다.

```bash
cd /home/soyeon/projects/cloverky.cloud && git revert --no-commit <머지 커밋> && git commit -m "revert: roll back social login pre-registration"
```

```bash
cd /home/soyeon/projects/cloverky.cloud/clover && DATABASE_URL='postgresql+psycopg_async://cloverky:aacloverky04@localhost:5432/cloverky' .venv/bin/alembic downgrade h5c6d7e8f9a0 && docker compose build auth backend && docker compose up -d auth backend
```

`downgrade` 는 `user_oauth_accounts` 를 드롭한다. 백필 3행과 그동안 채워진 `provider_sub` 가 함께 사라지므로, 되돌린 뒤 다시 적용하면 `provider_sub` 는 NULL 상태로 시작한다 — 첫 로그인 때 다시 채워지므로 사용자에게 보이는 영향은 없다.
