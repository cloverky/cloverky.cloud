---
name: deploy
description: |
  cloverky.cloud 를 Docker Compose 로 배포한다.
  배포 전 하네스(린트·타입체크)와 시크릿 유출 검사를 실행하고,
  실제 재시작 전에 반드시 사용자 승인을 받는다.
argument-hint: "[서비스명: backend | frontend | auth | all]"
disable-model-invocation: true
user-invocable: true
---

# deploy — cloverky.cloud 배포

> **이 스킬은 외부에 영향을 주는 작업이다.** 프로덕션 도메인(`api.cloverky.cloud`,
> `auth.cloverky.cloud`)이 걸려 있고 컨테이너가 재시작된다.
> **§4 승인 게이트를 통과하기 전에는 `up -d` 를 실행하지 않는다.**

인자로 서비스명을 받는다. 없으면 사용자에게 대상을 묻는다.
빌드 대상은 `backend` · `frontend` · `auth` 세 개뿐이며, 나머지(pgvector, redis, neo4j,
qdrant, n8n, pgadmin)는 이미지를 그대로 쓰므로 빌드하지 않는다.

---

## 0. 배포 차단 조건 (Blocking — 먼저 확인)

**하나라도 걸리면 배포를 중단하고 사용자에게 보고한다.**

```bash
# (a) 시크릿이 이미지에 구워지는지 — 최우선
test -f clover/.dockerignore || echo "🔴 BLOCK: clover/.dockerignore 없음"
```

`clover/Dockerfile:17` 은 `COPY . clover/` 로 빌드 컨텍스트 전체를 복사한다.
`clover/.dockerignore` 가 없으면 `clover/.env`(`AWS_SECRET_ACCESS_KEY`, `ADMIN_PASSWORD`,
`GEMINI_API_KEY` …)와 `clover/.env.auth`(**`JWT_PRIVATE_KEY`**, OAuth 시크릿)가
이미지 레이어에 그대로 들어간다.

`backend` 와 `auth` 는 **같은 컨텍스트(`./clover`)·같은 Dockerfile** 로 빌드되므로,
`docker-compose.yaml` 주석이 약속한 "개인키는 auth 에만" 이 깨지고 서명키가 backend
이미지에도 포함된다. → `.dockerignore` 를 만들기 전에는 **빌드하지 않는다.**

```bash
# (b) 커밋되지 않은 변경 확인
git status --short
git rev-parse --abbrev-ref HEAD    # main 이 아니면 사용자에게 확인
```

---

## 1. 하네스 (배포 전 필수)

변경된 영역만 실행한다. **에러는 무시하지 않는다 — 실패하면 배포를 중단한다.**

```bash
# 백엔드
cd clover && ruff check . && ruff format --check .
cd clover && mypy . --config-file pyproject.toml
cd clover && python3 -m importlinter          # 스타 토폴로지 의존성

# 프론트엔드
cd lucky && npm run lint
cd lucky && npx tsc --noEmit
```

> ⚠️ 이 머신에는 `python` 이 없다 (`python3` 만 존재). 루트 `CLAUDE.md` 의
> `python …` 명령을 그대로 쓰지 말고 `python3` 로 실행한다.
> `scripts/validate-harness.py` 와 `pre-commit` 은 **아직 리포에 없다.**

---

## 2. 테스트

```bash
cd clover && pytest -m "not korean_ai"     # korean_ai 는 ollama+kiwipiepy 필요
```

`clover/pytest.ini` 의 `testpaths` 는 `apps/titanic/tests` 로 한정돼 있다.
다른 앱을 배포한다면 경로를 명시한다 (예: `pytest apps/fridge/tests`).

---

## 3. import 정합성

```bash
cd clover && python3 -c "import main"       # backend
cd clover && python3 -c "import auth_main"  # auth
```

---

## 4. 승인 게이트 (건너뛰지 말 것)

빌드·재시작 **직전에** 다음을 사용자에게 제시하고 명시적 승인을 받는다:

1. 배포 대상 서비스와 영향받는 도메인
2. 배포될 커밋 (`git log -1 --oneline`)
3. §0~3 결과 요약 (통과/실패)
4. **비용이 발생하는 항목이 있으면 먼저 경고한다** — 유료 API 키가 새 컨테이너에서
   활성화되는 경우, 클라우드 리소스가 새로 뜨는 경우 등

사용자가 승인하기 전에는 `docker compose up -d` 를 실행하지 않는다.

---

## 5. 배포

```bash
# 대상 서비스만 (권장)
docker compose build backend && docker compose up -d backend

# 전체
docker compose build backend frontend auth
docker compose up -d backend frontend auth
```

- 모든 서비스에 `restart: always` 가 걸려 있다. **크래시 루프가 정상 기동처럼 보일 수 있으니**
  반드시 §6 으로 검증한다.
- `auth` 는 Compose 에서 `command:` 를 오버라이드해 `auth_main:app` 을 9000 포트로 띄운다.
- 인프라 서비스(pgvector·redis·neo4j·qdrant)는 데이터 볼륨을 쓰므로 `down -v` 를 쓰지 않는다.

---

## 6. 검증

```bash
docker compose ps                      # State 가 running 인지 + 재시작 횟수
docker compose logs --tail=50 backend  # 크래시 루프 흔적 확인
curl -sf http://localhost:8000/docs > /dev/null && echo "backend OK"
curl -sf http://localhost:9000/docs > /dev/null && echo "auth OK"
curl -sf http://localhost:3000        > /dev/null && echo "frontend OK"
```

컨테이너가 계속 재시작 중이면 **롤백**한다 (§7). 로그가 잘려 보이면 Dockerfile 에
`PYTHONUNBUFFERED=1` 이 없어서일 수 있다 — 마지막 출력이 버퍼에 남아 유실된다.

---

## 7. 롤백

```bash
git log --oneline -5                   # 직전 정상 커밋 확인
git checkout <이전-커밋> -- <변경파일>
docker compose build <서비스> && docker compose up -d <서비스>
```

DB 마이그레이션은 `clover/main.py` lifespan 의 `_migrate_tables` 가 기동 시 실행한다.
**스키마가 바뀐 배포는 코드만 되돌려도 복구되지 않으므로**, 롤백 전에 사용자에게
스키마 변경 여부를 확인한다.

---

## 배포 후

- 아키텍처·계약이 바뀌었으면 `_docs/` 와 해당 앱의 `CLAUDE.md` 를 갱신한다 (루트 §Harness engineering workflow).
- 커밋·푸시는 **사용자가 요청할 때만** 한다.
