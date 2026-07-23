AUTH-GATEWAY-HARNESS.md


Claude Code 작업 지시서 — 인증 게이트웨이(auth.ragtailor.com) 분리 배포
대상 저장소: fastapi/ 모노레포 (apps/ 영화 앱 구조)
원칙: 기존 구조 무변경, 추가만 허용. 발급은 auth 컨테이너에서만, 백엔드는 검증만.

---

0. 컨텍스트

- 현재 main.py 하나로 api.ragtailor.com에 배포 중. apps/ 하위 영화 제목 앱들이 비즈니스 라우터.
- 목표: 같은 코드베이스에서 엔트리포인트를 분리해 auth.ragtailor.com(인증 전용)과 api.ragtailor.com(비즈니스)을 별도 컨테이너로 운영.
- 네트워크: Docker 공유 네트워크 dreamscape, 진입은 cloudflared 터널만. 호스트 포트 미노출.
- 키 체계: RS256 비대칭. 개인키는 auth 컨테이너에만 존재.

1. 절대 규칙 (위반 시 작업 중단 후 보고)

- apps/ 하위 기존 영화 앱 코드는 한 줄도 수정하지 않는다.
- 어떤 서비스에도 docker-compose.yml에 ports: 매핑을 추가하지 않는다.
- JWT 검증부의 허용 알고리즘은 algorithms=["RS256"] 리터럴로 하드코딩한다. 환경변수·설정으로 빼지 않는다.
- 개인키(JWT_PRIVATE_KEY)를 읽는 코드는 발급 함수에만 존재해야 한다. 검증 경로에서 개인키 참조 발견 시 즉시 수정.
- 비밀키·개인키를 저장소에 커밋하지 않는다. .env.*는 .gitignore에 추가.
- 영화 앱들이 apps.auth를 import하는 코드를 작성하지 않는다. 백엔드가 쓸 수 있는 것은 core.dependencies뿐.

2. 작업 목록


2.1 apps/auth/ 신규 생성

```
apps/auth/
├── __init__.py
├── router.py      # POST /login, POST /logout, POST /refresh, GET /callback/{provider}, GET /.well-known/jwks.json
├── services.py    # OAuth Provider 연동(Google, Kakao), 토큰 발급 오케스트레이션
├── schemas.py     # TokenResponse, LoginRequest, RefreshRequest 등 Pydantic 스키마
└── rbac.py        # Role(str, Enum), Permission 정의, role→permission 매핑 테이블

```
- router.py의 엔드포인트는 위 5개로 시작. 회원가입 등은 이번 범위 밖.
- /.well-known/jwks.json은 공개키를 JWK 형식(kid 포함)으로 반환. 백엔드/외부 검증자가 사용.
- 리프레시 토큰: Redis(totem) 저장, 로테이션 방식. 재사용 감지 시 해당 사용자 세션 전체 폐기.

2.2 core/security.py 개선 (기존 파일 수정 — 함수 분리)

```
# 발급부 — auth 컨테이너 전용 (JWT_PRIVATE_KEY 필요)
def create_access_token(sub: str, roles: list[str], aud: str, expires_min: int = 10) -> str: ...
def create_refresh_token(sub: str) -> str: ...

# 검증부 — 모든 컨테이너 공용 (JWT_PUBLIC_KEY만 필요)
def verify_token(token: str, aud: str) -> TokenPayload: ...
    # jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience=aud)

# 쿠키 설정 — auth 발급 시 사용
COOKIE_KWARGS = dict(
    domain=".ragtailor.com", secure=True, httponly=True, samesite="lax",
)

# 해싱 — auth 전용
def hash_password(raw: str) -> str: ...      # bcrypt 또는 argon2
def verify_password(raw: str, hashed: str) -> bool: ...

```
- 발급 함수는 모듈 로드 시점이 아니라 호출 시점에 JWT_PRIVATE_KEY를 읽는다. 백엔드 컨테이너에서 모듈 import만으로 키 부재 에러가 나면 안 된다.
- access token 클레임: sub, roles, aud, exp, iat, jti, kid(헤더).
- aud는 서비스별 상이 (ragtailor-api, ragtaylor-api, acoder-api). 교차 사용 불가.

2.3 core/dependencies.py 개선

```
async def get_current_user(request: Request) -> TokenPayload: ...
    # 쿠키 또는 Authorization 헤더에서 토큰 추출 → verify_token(aud=settings.SERVICE_AUD)

class RoleChecker:
    def __init__(self, *allowed: Role): ...
    def __call__(self, user: TokenPayload = Depends(get_current_user)): ...
        # roles 클레임 검사, 미충족 시 403

```
- Redis 블랙리스트 조회(jti 기준)를 get_current_user에 포함 — 즉시 차단 계정 처리용.

2.4 auth_main.py 신규 생성 (루트, main.py 옆)

- 기존 login_gate.py는 삭제하지 말고 그대로 둔다. 신규 파일로 작성 후, 동작 검증 완료 시점에 별도 커밋으로 login_gate.py 제거 여부를 사용자에게 확인받는다.
```
from fastapi import FastAPI
from apps.auth.router import router as auth_router

app = FastAPI(
    title="RAG Tailor Auth",
    docs_url=None, redoc_url=None, openapi_url=None,  # 실서비스: 문서 비노출
)
app.include_router(auth_router, prefix="/auth")

@app.get("/healthz")
async def healthz(): return {"ok": True}

```

2.5 main.py 확인 (수정 최소화)

- 영화 앱 라우터 include 구성 유지. apps.auth include가 없는지 확인만 한다.
- 보호가 필요한 라우터에 dependencies=[Depends(RoleChecker(Role.USER))] 적용은 이번 범위에서 예시 1개 앱에만 적용해 패턴을 보인다 (대상 앱은 사용자에게 질문).

2.6 docker-compose.yml 서비스 추가

```
  auth:
    build: .
    command: uvicorn auth_main:app --host 0.0.0.0 --port 9000
    env_file: .env.auth          # JWT_PRIVATE_KEY, OAuth client secrets
    networks: [dreamscape]
    restart: unless-stopped

```
- 기존 백엔드 서비스의 env_file을 .env.backend로 분리 (JWT_PUBLIC_KEY만 포함).
- 두 서비스 모두 ports: 없음 유지.

2.7 키 생성 스크립트 scripts/generate_jwt_keys.sh

```
#!/usr/bin/env bash
set -euo pipefail
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
echo "jwt_private.pem → .env.auth 의 JWT_PRIVATE_KEY 로"
echo "jwt_public.pem  → .env.backend 의 JWT_PUBLIC_KEY 로"

```
- PEM 파일은 .gitignore에 추가. 멀티라인 환경변수 주입 방식(예: base64 인코딩 후 디코드)을 config에서 처리.

2.8 cloudflared ingress (odyssey — 코드 저장소 밖, 지시만 출력)

```
ingress:
  - hostname: auth.ragtailor.com
    service: http://auth:9000
  - hostname: api.ragtailor.com
    service: http://backend:8000
  - service: http_status:404

```

```
cloudflared tunnel route dns <터널이름> auth.ragtailor.com

```
- 이 항목은 코드 변경이 아니므로 작업 완료 보고서에 "수동 적용 필요" 섹션으로 출력한다.

2.9 .importlinter contract 추가

```
[importlinter:contract:auth-isolation]
name = apps.auth is only imported by auth_main
type = forbidden
source_modules =
    apps.harry_porter
    apps.titanic
    apps.star_craft
    apps.lion_king
    apps.moneyball
    apps.sherlock_homes
    apps.silicon_valley
    apps.kingsman
    apps.dumb_and_dumber
forbidden_modules =
    apps.auth

```
- 실제 앱 목록은 apps/ 디렉터리를 읽어 정확히 반영한다.

3. 완료 기준 (Acceptance Criteria)

- [ ] uvicorn auth_main:app 단독 기동 성공, /healthz 200.
- [ ] uvicorn main:app 기동 시 JWT_PRIVATE_KEY 없이 정상 동작 (import 에러 없음).
- [ ] auth에서 발급한 토큰을 backend의 verify_token이 공개키만으로 검증 통과.
- [ ] aud가 다른 토큰은 검증 실패(403)하는 테스트 존재.
- [ ] 만료 토큰, 서명 변조 토큰, alg=none/HS256 강제 토큰 각각 거부하는 테스트 존재.
- [ ] 리프레시 토큰 재사용 시 세션 전체 폐기되는 테스트 존재.
- [ ] lint-imports 통과 (auth-isolation contract 포함).
- [ ] pytest 전체 통과. 기존 테스트 회귀 없음.

4. 진행 방식

1. 작업 전 apps/, core/, main.py, login_gate.py 현재 상태를 읽고 요약 보고 후 시작.
2. 커밋 단위: 2.1→2.2→2.3→(2.4+2.5)→(2.6+2.7)→2.9 순으로 기능별 분리 커밋.
3. 기존 core/security.py에 HS256 발급/검증 코드가 있으면 삭제하지 말고 deprecated 주석 처리 후 보고 — 마이그레이션 판단은 사용자 몫.
4. 불명확한 지점(기존 User 모델 스키마, Redis 키 네임스페이스, OAuth provider 우선순위)은 추측하지 말고 질문한다.