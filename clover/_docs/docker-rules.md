# Docker 룰 (Harness)

> **최우선 원칙**: DB·백엔드 등 인프라 서비스는 **함부로 새로 만들지 않는다.**
> 이미 존재하는 것이 있으면 반드시 먼저 확인하고, 사용자 승인을 받은 뒤에만 생성한다.

---

## 1. 중복 생성 금지 룰 (Check-Before-Create)

사용자가 "DB 만들어줘", "백엔드 컨테이너 추가해줘" 처럼 인프라 서비스 생성을 요청하더라도,
**무조건 만들지 않는다.** 아래 순서를 반드시 거친다.

### 절차

1. **기존 확인 (Check)** — 생성 전 반드시 아래를 조사한다.
   - `docker-compose.yaml`의 `services:`에 동일/유사 서비스가 있는가?
   - 실행 중인 컨테이너: `docker compose ps` / `docker ps`
   - 같은 포트를 이미 점유한 서비스가 있는가? (아래 §3 포트 표 대조)
   - 같은 목적의 볼륨(`volumes:`)이 이미 있는가?

2. **보고 (Report)** — 기존에 존재하면, 새로 만들지 말고 사용자에게 먼저 알린다.
   - 예: "`pgvector` DB 서비스가 이미 `docker-compose.yaml:20`에 있고 5432 포트를 쓰고 있어. 새로 만들지 않고 이걸 쓰면 될 것 같은데, 그래도 별도로 만들까?"

3. **승인 (Approve)** — 사용자가 **명시적으로 새로 만들라고 승인한 경우에만** 생성한다.
   - 승인 없이 임의로 중복 서비스를 추가하지 않는다.

4. **미존재 시** — 동일/유사 서비스가 전혀 없을 때는, 계획을 간단히 밝히고 진행한다.

### 판단 기준: "이미 있는 것"으로 볼 대상

| 요청 | 이미 있는 것으로 간주 |
|------|----------------------|
| PostgreSQL / DB | `pgvector` (pgvector/pgvector:pg17, 5432) |
| 백엔드 | `backend` (./clover, 8000) |
| 캐시 / Redis | `redis` (6379) |
| 벡터 DB | `pgvector`(pgvector 확장) 또는 `qdrant` (6333/6334) |
| 그래프 DB | `neo4j` (7474/7687) |
| DB 관리 UI | `pgadmin` (5050) |
| 워크플로우 자동화 | `n8n` (5678) |

---

## 2. 기존 인프라 서비스 (Source of Truth)

`docker-compose.yaml`이 유일한 소스다. 아래는 현재 정의된 서비스 요약이며,
**새 서비스 생성 요청 시 반드시 이 표와 먼저 대조한다.**

| 서비스 | 이미지 | 역할 | 이미 존재? |
|--------|--------|------|-----------|
| `backend` | build ./clover | FastAPI 백엔드 | ✅ 있음 |
| `pgvector` | pgvector/pgvector:pg17 | PostgreSQL(+pgvector) | ✅ 있음 |
| `redis` | redis:7-alpine | 캐시 | ✅ 있음 |
| `neo4j` | neo4j:5-community | 그래프 DB | ✅ 있음 |
| `qdrant` | qdrant/qdrant:latest | 벡터 DB | ✅ 있음 |
| `n8n` | n8nio/n8n | 워크플로우 자동화 | ✅ 있음 |
| `pgadmin` | dpage/pgadmin4 | DB 관리 UI | ✅ 있음 |

> 위 서비스와 동일 목적의 새 서비스 요청 → **§1 절차(확인→보고→승인)** 를 반드시 밟는다.

---

## 3. 포트 충돌 방지 표

새 서비스를 추가할 때 아래 포트는 이미 점유되어 있다. 충돌하면 중복 가능성이 높으니 §1 절차를 따른다.

| 포트 | 서비스 |
|------|--------|
| 8000 | backend |
| 5432 | pgvector |
| 6379 | redis |
| 7474 / 7687 | neo4j |
| 6333 / 6334 | qdrant |
| 5678 | n8n |
| 5050 | pgadmin |

---

## 4. 코드 변경 후 재빌드

백엔드 코드 변경 후에는 재빌드가 필수다. (루트 CLAUDE.md와 동일)

```bash
docker compose build backend && docker compose up -d backend
```

- 인프라(DB·redis 등)는 데이터 볼륨이 있으므로 **함부로 `down -v` 하지 않는다.**
- `docker compose down -v`는 볼륨을 삭제한다 → 데이터 유실. 사용자 승인 없이는 실행 금지.
