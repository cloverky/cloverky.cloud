# 소셜 로그인 사전가입 강제 — 설계

작성일: 2026-08-02 · 브랜치: `soyeon`

`clover` 백엔드(auth 게이트웨이 · secom)와 `lucky` 웹에 걸치므로 문서 배치 규칙에 따라 루트 `_docs/`에 둔다.

## 배경

지금 소셜 로그인은 **로그인이 곧 가입**이다.

`clover/apps/auth/app/use_cases/auth_interactor.py:87` `handle_callback` 은 소셜에서 받은 이메일로 `users` 를 조회하고, 없으면 그 자리에서 계정을 만든다.

```python
user = await self._users.get_by_email(identity.email)
is_new_user = user is None
if user is None:
    user = await self._users.create_oauth_user(identity.email, identity.name)
```

그래서 아무 카카오 계정이나 버튼 한 번으로 회원이 된다. 신규 사용자는 `/signup/consent` 로 보내지만, **계정은 동의 화면을 보기 전에 이미 만들어져 있다.**

여기에 더해 세 가지 구조적 문제가 있다.

| 문제 | 현재 |
|---|---|
| provider 미기록 | `users` 테이블에 provider 컬럼이 없다. 게이트웨이는 `ProviderIdentity.provider_sub` 를 받아놓고 **버린다**. 카카오로 들어왔는지 구글로 들어왔는지 DB에 남지 않는다. |
| 의도 구분 불가 | 로그인 모달과 회원가입 모달이 **같은** `SocialLoginButtons` 를 쓴다. 서버는 지금 들어온 요청이 로그인인지 가입인지 알 수 없다. |
| 우회로 | `clover/apps/secom/adapter/inbound/api/v1/oauth_router.py` 가 같은 자동 생성을 `api.cloverky.cloud/auth/{provider}` 에서 그대로 한다. 프론트는 안 쓰지만 `main.py:343` 에 mount 돼 살아있다. |

## 목표

소셜 로그인은 **그 provider로 가입한 사람만** 통과시킨다. 미가입자는 "등록되지 않은 계정" 안내와 함께 회원가입 창으로 보낸다.

## 확정 결정

| 항목 | 결정 |
|---|---|
| 연동 판정 기준 | **provider까지 정확히 일치.** 카카오로 가입한 사람이 구글로 로그인하면 거부한다. |
| 소셜 가입 경로 | **회원가입 모달의 소셜 버튼만 신규 생성을 허용한다.** 로그인 모달의 버튼은 기존 연동 계정만 통과시킨다. |
| 의도 전달 | **서버가 Redis state에 실어 보관.** 클라이언트가 쿼리스트링으로 바꿀 수 없다. |
| 기존 소셜 계정 3건 | **마이그레이션에서 백필.** 지금 쓰던 계정 그대로 로그인된다. |
| 레거시 라우터 | **제거.** `secom` 의 `oauth_router` 를 mount 해제하고 파일을 지운다. |
| 비밀번호 로그인 | **변경 없음.** 데모 계정 `a@a` 는 그대로 동작한다. |
| 동의 화면 | **그대로 재사용.** `/signup/consent` 계약을 바꾸지 않는다. |

## 데이터 모델

### 새 테이블 `user_oauth_accounts`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `Integer` PK | `EntityIdMixin` — 프로젝트 공통 PK 규칙 |
| `user_id` | `Integer` FK→`users.id`, NOT NULL | |
| `provider` | `String(20)` NOT NULL | `google` / `kakao` / `naver` |
| `provider_sub` | `String(64)` NULL | 소셜측 고유 ID. 백필분은 NULL로 두고 첫 로그인 때 채운다 |
| `created_at` | `DateTime(timezone=True)` `server_default=now()` | |

제약:

- `unique(user_id, provider)` — 한 유저가 같은 provider를 두 번 연동하지 못한다.
- `unique(provider, provider_sub)` — **한 소셜 계정은 한 유저에게만 붙는다.**

ORM은 `clover/apps/users/adapter/user_oauth_account.py` 에 둔다. `users` 스포크가 정본을 갖고, auth 게이트웨이는 `users.adapter.user.User` 를 재사용하는 지금 방식(`user_pg_repository.py:8`)을 그대로 따른다.

### 왜 `users` 컬럼 두 개가 아니라 별도 테이블인가

`unique(provider, provider_sub)` 가 "한 소셜 계정은 한 유저에게만"을 강제하는 실제 보안 경계다. 이걸 테이블 제약으로 두는 편이 넓은 `users` 위의 부분 유니크 인덱스보다 의도가 분명하다. `users` 는 이미 냉장고 도메인 컬럼(`default_storage`)까지 섞여 있어 인증 관심사를 더 얹고 싶지 않다.

대가는 조인 한 번과 파일 몇 개다. 1:1 관계만 필요한 지금 기준으로는 컬럼 두 개가 더 짧지만, 제약의 표현력을 이유로 테이블을 택한다.

## 의도(login / signup) 전달

`RedisOAuthStateStore` 는 지금 `auth:state:{state}` 에 값 `"1"` 을 쓰고 TTL 300초를 건다. **이 값 자리에 mode를 넣는다.**

```
issue(mode: str) -> str          # 값을 "login" / "signup" 으로 저장
consume(state: str) -> str | None  # mode 반환. 키가 없으면 None
```

포트 `OAuthStateRepository` 의 시그니처도 같이 바꾼다. `consume` 의 반환 타입이 `bool` → `str | None` 으로 바뀌므로 인터랙터의 state 검증은 `if mode is None: raise ValueError(...)` 가 된다. 기존 "유효하지 않거나 만료된 state 입니다." 메시지는 유지한다.

**mode를 Redis에 두는 이유:** 소셜 동의 화면을 왕복하는 동안 의도가 사용자 브라우저를 거쳐 간다. 쿼리스트링이나 쿠키에 실으면 사용자가 `mode=signup` 으로 바꿔 가입 강제 자체를 무력화할 수 있다. state는 서버가 발급하고 서버만 읽으므로 위조가 불가능하다.

### 진입점

```
GET /auth/login/{provider}    ← 기존. mode=login
GET /auth/signup/{provider}   ← 신규. mode=signup
```

`POST /auth/login` (authorize URL을 JSON으로 돌려주는 프로그래밍 진입점)은 `mode="login"` 으로 고정한다. 프론트에서 쓰이지 않지만 시그니처 변경에 맞춰 유지한다.

## 콜백 분기

`handle_callback` 을 다음과 같이 바꾼다.

```
mode = states.consume(state)          # None이면 기존대로 state 에러
identity = providers[provider].exchange_code(code)

link = users.find_link(provider, identity.provider_sub)
if link is None:
    link = users.claim_backfilled_link(provider, identity.email, identity.provider_sub)

[mode == "login"]
    link 있음  → 토큰 발급, is_new_user=False        (기존 동작)
    link 없음  → NotRegisteredError(provider, email, name)

[mode == "signup"]
    link 있음                  → 이미 가입돼 있으니 그냥 로그인. is_new_user=False
    link 없고 email 이미 존재   → EmailAlreadyRegisteredError(provider, email)
    둘 다 없음                 → create_oauth_user + create_link, is_new_user=True
```

### `claim_backfilled_link`

백필로 넣은 행은 `provider_sub` 가 NULL이다. 첫 로그인 때 `(provider, email)` 로 그 행을 찾아 `provider_sub` 를 채워 넣고 링크로 인정한다. `provider_sub` 가 이미 있는 행은 대상이 아니므로 계정당 정확히 한 번만 일어난다.

이 단계가 없으면 백필된 3명은 영구히 로그인할 수 없다 — 우리는 그들의 소셜측 고유 ID를 모르기 때문이다.

### 매칭 우선순위

`provider_sub` 우선, 그다음 이메일(백필 행에 한해서). 이메일은 바뀔 수 있고 카카오는 이메일 제공이 선택이라 `kakao_{id}@kakao.local` 폴백이 쓰인다. `provider_sub` 가 불변 식별자다.

### 예외

`auth.app.dtos.auth_dto` 에 두 예외를 정의한다. 라우터가 이 둘을 잡아 에러 리다이렉트로 바꾼다.

| 예외 | 프론트로 넘길 `error` 값 |
|---|---|
| `NotRegisteredError` | `not_registered` |
| `EmailAlreadyRegisteredError` | `email_taken` |

`ValueError` 를 재사용하지 않는다 — 라우터가 이미 `ValueError` 를 400 HTTPException으로 바꾸고 있어(`auth_router.py:135`) 섞이면 구분이 안 된다.

## 에러를 팝업 밖으로 꺼내기

콜백은 브라우저 리다이렉트다. 여기서 401 JSON을 던지면 사용자는 팝업 안에서 raw JSON을 보게 된다. 대신 **프론트로 에러 리다이렉트**를 보낸다.

```
{FRONTEND_URL}/oauth/callback?error=not_registered&provider=kakao&email=…&name=…
```

토큰 쿼리 파라미터는 싣지 않는다. 쿠키도 심지 않는다.

### 프론트 흐름

```
팝업: /oauth/callback?error=…
   └→ postMessage({type:'oauth_error', reason, provider, email, name}) → window.close()

오프너: SocialLoginButtons 의 onMsg 가 수신
   └→ onError(reason, {provider, email, name})

LoginDialog:
   reason === 'not_registered'
   └→ 로그인 모달 닫기 → 회원가입 모달 열기 (email·name 프리필 + 안내 배너)

SignUpDialog:
   reason === 'email_taken'
   └→ 상단 배너로 표시 (모달 유지)
```

### 파일별 변경

| 파일 | 변경 |
|---|---|
| `lucky/app/oauth/callback/page.tsx` | `error` 파라미터 분기 추가. 있으면 토큰 저장 없이 `oauth_error` postMessage 후 close |
| `lucky/components/social-login-buttons.tsx` | `mode: 'login' \| 'signup'` prop으로 진입 URL 결정. `onError?` prop 추가 |
| `lucky/components/login-dialog.tsx` | `<SocialLoginButtons mode="login" onError={…}>`. `not_registered` 시 회원가입 모달로 전환 |
| `lucky/components/signup-dialog.tsx` | `<SocialLoginButtons mode="signup" onError={…}>`. `notice`/프리필 prop 수용 |
| `lucky/components/sign-up-dialog-context.tsx` | `() => void` → `(prefill?: SignUpPrefill) => void` |
| `lucky/components/app-shell.tsx` | `signUpPrefill` 상태 추가, `openSignUp(prefill)` 배선 |

`SignUpPrefill` 타입: `{ email?: string; name?: string; notice?: string }`.

`sign-up-dialog-context.tsx` 의 `useOpenSignUp` 은 지금 `ctx ?? (() => {})` 로 no-op 폴백을 준다. 인자를 받는 형태로 바꿔도 이 폴백은 그대로 유효하다.

### 문구

| 상황 | 문구 |
|---|---|
| 미가입 소셜 로그인 | **등록되지 않은 계정입니다. {카카오/네이버/구글} 계정으로 먼저 회원가입해 주세요.** |
| 가입 시 이메일 중복 | **이미 가입된 이메일입니다. 가입할 때 사용한 방법으로 로그인해 주세요.** |

provider 한글명은 프론트에서 `{google:'구글', kakao:'카카오', naver:'네이버'}` 로 매핑한다.

`not_registered` 는 login 모드에서만, `email_taken` 은 signup 모드에서만 나온다. 그래도 두 모달 모두 **모르는 `reason` 은 "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." 로 처리**한다 — 서버가 나중에 새 에러를 추가해도 사용자가 빈 화면을 보지 않게 한다.

## 레거시 라우터 제거

- `clover/main.py:55` — `from secom.adapter.inbound.api.v1.oauth_router import oauth_router` 삭제
- `clover/main.py:343` — `app.include_router(oauth_router)` 삭제
- `clover/apps/secom/adapter/inbound/api/v1/oauth_router.py` — 파일 삭제

프론트는 google·naver·kakao를 모두 auth 게이트웨이로 보내므로(`social-login-buttons.tsx:9` `GATEWAY_PROVIDERS`) 깨지는 호출자가 없다.

import-linter 계약에는 영향이 없다. `auth` → `secom.app.utils.auth_password` 의존(`auth_interactor.py:25`)은 라우터와 무관하게 유지된다.

## 마이그레이션

alembic revision 하나로 처리한다.

**upgrade**
1. `user_oauth_accounts` 테이블 + 두 유니크 제약 생성
2. 백필 — 이메일로 `users` 를 조회해 존재하는 것만 INSERT

   | 이메일 | provider |
   |---|---|
   | `hisoyeon04@gmail.com` | `google` |
   | `kakao_5002583421@kakao.local` | `kakao` |
   | `soyeon8165@naver.com` | `naver` |

   `provider_sub` 는 NULL. 첫 로그인 때 `claim_backfilled_link` 가 채운다.
   `INSERT … SELECT id, 'google' FROM users WHERE email = …` 형태라 해당 유저가 없는 환경에서는 0건이 들어가고 조용히 넘어간다.

**downgrade**
테이블 drop.

백필 대상은 `a@a`(비밀번호 계정)를 제외한 3건이다. `a@a` 는 소셜 연동이 없으므로 소셜 로그인은 거부되고 비밀번호 로그인만 된다 — 의도한 동작이다.

## 테스트

### 백엔드 (`clover/apps/auth/tests/`)

기존 pytest 구조를 따른다. `conftest.py` 의 가짜 리포지토리에 `find_link` / `create_link` / `claim_backfilled_link` 를 추가하고, 가짜 state store가 mode를 보관하도록 고친다.

`test_auth_interactor.py` — `handle_callback` 7케이스:

| # | mode | 상황 | 기대 |
|---|---|---|---|
| 1 | login | 연동 없음 | `NotRegisteredError` |
| 2 | login | 다른 provider로만 연동됨 | `NotRegisteredError` |
| 3 | login | 해당 provider로 연동됨 | 토큰 발급, `is_new_user=False` |
| 4 | login | 백필 행(sub=NULL) 존재 | 통과 + `provider_sub` 가 채워짐 |
| 5 | signup | 완전 신규 | 유저 생성 + 링크 생성, `is_new_user=True` |
| 6 | signup | 이메일이 이미 존재, 링크 없음 | `EmailAlreadyRegisteredError` |
| 7 | signup | 이미 같은 provider로 연동됨 | 토큰 발급, `is_new_user=False` |

`test_auth_router.py` — 3케이스:

| # | 검증 |
|---|---|
| 1 | `GET /auth/signup/{provider}` 가 provider 동의 화면으로 302 |
| 2 | `NotRegisteredError` 발생 시 `…/oauth/callback?error=not_registered&…` 로 리다이렉트 |
| 3 | 에러 리다이렉트에 토큰 쿼리·토큰 쿠키가 실리지 않음 |

mode 배선 자체는 별도 케이스를 두지 않는다 — 같은 미연동 상태에서 케이스 1(login → 거부)과 케이스 5(signup → 생성)가 갈리는 것으로 검증된다.

### 프론트 (`lucky/`)

테스트 러너가 없다 — `package.json` scripts에 `lint` 뿐이다. 다음으로 검증한다.

```
npx tsc --noEmit      # next.config.mjs 의 ignoreBuildErrors:true 때문에 별도 실행 필수
npm run lint
```

그리고 브라우저에서 수동 확인 — 미가입 소셜 로그인 → 회원가입 모달 전환, 소셜 가입 → 동의 화면 → 로그인 완료.

## 배포

| 대상 | 필요한 작업 |
|---|---|
| `lucky` 프론트 | Vercel이 서빙하므로 push만 하면 된다. WSL 프론트 컨테이너 재빌드 불필요. |
| auth 게이트웨이 | `docker compose build auth && docker compose up -d auth` (WSL `clover/` 에서) |
| backend | 레거시 라우터 제거분 반영 — `docker compose build backend && docker compose up -d backend` |
| DB | `alembic upgrade head` |

마이그레이션을 먼저 적용하고 컨테이너를 올린다. 순서가 뒤집히면 새 코드가 없는 테이블을 조회한다.
