# 008 — Neo4j Docker 배포 전략

> 선행 문서: [[004-langgraph-harness]] (이 전략의 요구사항 출처), [[002-neo4j-harness]] (그래프 모델링 규칙)
> 목적: [[004-langgraph-harness]]의 GraphRAG 루프(`retrieve → grade → answer`)가 안정적으로 돌아가려면
> Neo4j 컨테이너 자체가 그 요구를 감당할 수 있어야 한다. 이 문서는 **현재 실제 배포 상태를 실측**하고,
> 하네스 요구사항 대비 갭을 메우는 전략을 정한다.

---

## 1. 현재 상태 (실측, 2026-07)

```yaml
# docker-compose.yaml
neo4j:
  image: neo4j:5-community
  ports:
    - "7474:7474"
    - "7687:7687"
  environment:
    - NEO4J_AUTH=neo4j/aacloverky04
  volumes:
    - neo4j_data:/data
  restart: always
```

| 항목 | 실측값 |
|------|--------|
| 버전 | Neo4j **5.26.28 Community** (`neo4j:5-community` — 마이너 버전이 고정되지 않은 플로팅 태그) |
| 플러그인 | 없음 (APOC 미설치) |
| 메모리 | `server.memory.pagecache.size=512M` (이미지가 자동 산정). 힙(heap) 설정 없음 |
| 볼륨 | `neo4j_data:/data` — 컨테이너 재생성해도 데이터 유지, 현재 517MB 사용 |
| 헬스체크 | 없음 |
| 백업 | 없음 |
| 호스트 자원 | 총 11GB 메모리 중 가용 3.9GB, 디스크는 893GB 여유 — **메모리가 타이트한 편** |

**갭 요약**: 지금 구성은 "켜져 있고 데이터가 살아남는다" 수준이다. [[004-langgraph-harness]]가
전제하는 GraphRAG 파이프라인(스키마 조회, 엔티티 병합, 반복 조회)을 프로덕션급으로 지탱하기엔 부족하다.

---

## 2. 004 하네스가 요구하는 것 → 이 컨테이너가 채워야 할 것

| 004 하네스의 요구 | 필요한 인프라 | 현재 상태 |
|--------------------|---------------|-----------|
| §1 GraphRAG Ingestion 고도화 (엔티티·관계 추출, `neo4j-graphrag`) | **APOC 플러그인** — `neo4j_graphrag`가 스키마 조회(`apoc.meta.data`, `apoc.schema.nodes`)와 엔티티 중복 병합(`apoc.refactor.mergeNodes`)에 실제로 의존한다 (설치된 패키지 소스 확인됨) | ❌ 미설치 — 지금 `neo4j-graphrag`의 스키마 조회·엔티티 리졸버 기능을 쓰면 즉시 실패한다 |
| §3 `retrieve` 노드의 반복 호출(재시도 루프) | 쿼리 지연이 낮아야 루프 비용이 감당됨 → 페이지캐시가 그래프 크기에 맞아야 함 | ⚠️ 512MB 자동값 — 지금 데이터 크기(517MB)엔 맞지만 성장分 여유가 없다 |
| §6 백엔드가 Neo4j 준비 전에 붙는 문제 | `depends_on`이 **컨테이너 기동**이 아니라 **서비스 준비(healthy)**를 기다려야 함 | ❌ `docker-compose.yaml`의 `depends_on: [neo4j]`는 조건 없음 — Neo4j가 아직 부팅 중이어도 backend가 먼저 연결을 시도할 수 있다 |
| 재현 가능한 배포 (하네스 문서가 버전을 못박기 어려움) | 이미지 태그 고정 | ❌ `neo4j:5-community`는 플로팅 — `docker compose pull`이 예고 없이 마이너 버전을 올릴 수 있다 |
| 데이터 유실 방지 | 백업 전략 | ❌ 없음. Community Edition은 온라인 핫백업이 없어 **오프라인 덤프**가 유일한 방법 |

---

## 3. 전략

### 3.1 APOC 플러그인 설치 (필수 — 004 로드맵의 전제조건)

Neo4j 공식 이미지는 `NEO4J_PLUGINS` 환경변수만으로 플러그인을 자동 다운로드·설치한다.

```yaml
environment:
  - NEO4J_AUTH=neo4j/aacloverky04
  - NEO4J_PLUGINS=["apoc"]
  # APOC의 파일/네트워크 접근형 프로시저는 기본 차단 — 필요한 것만 화이트리스트
  - NEO4J_dbms_security_procedures_unrestricted=apoc.*
  - NEO4J_dbms_security_procedures_allowlist=apoc.meta.*,apoc.schema.*,apoc.refactor.mergeNodes
```

`allowlist`를 `apoc.*` 전체로 열지 않는다 — `apoc.load.*`(외부 URL 로드), `apoc.cypher.runFile` 같은
프로시저는 [[002-neo4j-harness]] §6의 "값은 항상 파라미터로" 원칙과 같은 이유로 공격 표면이 된다.
지금 `neo4j-graphrag`가 실제로 쓰는 것만 연다.

### 3.2 메모리 튜닝 (보수적으로)

호스트 가용 메모리가 3.9GB뿐이라 **공격적으로 늘리지 않는다.** 그래프가 커지기 전까지는
자동값(pagecache 512MB)이 데이터 크기(517MB)와 거의 맞아떨어져 있어 당장 급하지 않다.

```yaml
environment:
  - NEO4J_server_memory_heap_initial__size=512m
  - NEO4J_server_memory_heap_max__size=1G
  - NEO4J_server_memory_pagecache_size=1G
mem_limit: 2g   # 호스트 메모리 보호 — Neo4j가 남은 3.9GB를 다 잠식하지 않도록
```

**적용 전 반드시 `free -h`로 그 시점의 가용 메모리를 재확인한다** — 이 값은 2026-07 실측 기준이며
호스트에 다른 서비스가 늘어나면 달라진다.

### 3.3 헬스체크 + `depends_on` 순서 보장

Neo4j는 부팅에 수 초~수십 초가 걸린다. `backend`가 그 전에 연결을 시도하면 `main.py`의
DB 마이그레이션 단계에서 연결 실패로 이어질 수 있다.

```yaml
neo4j:
  # ...
  healthcheck:
    test: ["CMD-SHELL", "wget -q --spider http://localhost:7474 || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s

backend:
  depends_on:
    neo4j:
      condition: service_healthy
```

이 저장소의 compose 파일에는 아직 `healthcheck`를 쓰는 서비스가 하나도 없다 — **이 프로젝트에
새로 도입하는 패턴**이라는 점을 인지하고 적용한다.

### 3.4 이미지 태그 고정 (재현성)

```yaml
image: neo4j:5.26-community   # 5-community(플로팅) 대신 마이너 버전까지 고정
```

`neo4j-graphrag`·APOC 버전 호환성은 Neo4j 마이너 버전에 묶여 있다. 플로팅 태그로 두면
어느 날 `docker compose pull` 한 번에 APOC 호환이 깨질 수 있다. 업그레이드는 **의도적으로**,
태그를 명시적으로 올리는 커밋으로만 한다.

### 3.5 백업 (Community Edition 제약)

Community Edition은 온라인 핫백업이 없다. 정지 상태에서 덤프하는 방식만 가능하다.

```bash
# 1) 정지
docker stop cloverkycloud-neo4j-1

# 2) 오프라인 덤프 (컨테이너 재사용, DB 미기동 상태에서)
docker run --rm \
  -v cloverkycloud_neo4j_data:/data \
  -v "$(pwd)/backups":/backups \
  neo4j:5.26-community \
  neo4j-admin database dump neo4j --to-path=/backups

# 3) 재기동
docker start cloverkycloud-neo4j-1
```

복원은 `neo4j-admin database load --from-path=/backups neo4j` (동일하게 정지 상태에서).
`_docs`에는 백업 여부만 기록하고, 백업 파일 자체는 저장소에 커밋하지 않는다.

### 3.6 볼륨/영속성 — 이미 충족

`neo4j_data:/data`가 named volume이라 컨테이너 재생성(`docker compose up -d --force-recreate`)에도
데이터가 살아남는다. 여기는 변경할 게 없다.

---

## 4. 적용 순서 (권장)

1. **APOC** (3.1) — 004 로드맵이 이것 없이는 아예 진행 불가하므로 최우선
2. **healthcheck + depends_on** (3.3) — 장애 원인 진단 비용을 줄이는 저비용 고효과 변경
3. **이미지 태그 고정** (3.4) — 다음 배포 전에
4. **백업 스크립트** (3.5) — 운영 데이터가 쌓이기 전에 절차만이라도 정립
5. **메모리 튜닝** (3.2) — 그래프가 실제로 커질 때, 그 시점의 `free -h` 기준으로

---

## 5. 검증

```bash
# APOC 설치 확인
docker exec cloverkycloud-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASSWORD" \
  "RETURN apoc.version() AS version;"

# neo4j-graphrag의 스키마 조회가 실제로 동작하는지
docker exec cloverkycloud-backend-1 python -c "
from neo4j import GraphDatabase
# apoc.meta.data 호출 스모크 — 002-neo4j-harness.md의 GraphRepository.query() 경유 권장
"

# healthcheck 반영 확인
docker inspect cloverkycloud-neo4j-1 --format '{{.State.Health.Status}}'

# depends_on 순서 확인 — neo4j가 healthy가 되기 전엔 backend가 Created 상태에 머물러야 한다
docker compose up -d && docker compose ps
```

| 항목 | 성공 기준 |
|------|-----------|
| APOC | `apoc.version()`이 값 반환 (프로시저 없음 에러가 아님) |
| allowlist | 허용 목록 밖 프로시저(`apoc.load.json` 등) 호출 시 명시적으로 거부됨 |
| healthcheck | `docker inspect`의 `Health.Status`가 `healthy`로 전이 |
| 태그 고정 | `docker compose pull`이 예고 없이 버전을 바꾸지 않음 (매니페스트에 마이너 버전 명시) |
| 백업 | 덤프 파일 생성 후 `neo4j-admin database load`로 별도 컨테이너에 복원되는지 1회 리허설 |

---

## 6. 안티패턴

| 안티패턴 | 올바른 방향 |
|----------|------------|
| `NEO4J_PLUGINS=["apoc"]`만 걸고 allowlist를 안 좁힘 | §3.1 — 실제 쓰는 프로시저만 화이트리스트 |
| 호스트 가용 메모리 확인 없이 힙·페이지캐시를 크게 잡음 | §3.2 — 적용 직전 `free -h` 재확인, `mem_limit`으로 상한 |
| `neo4j:5-community`(플로팅 태그)를 프로덕션에 그대로 둠 | §3.4 — 마이너 버전까지 고정 |
| Community Edition에 온라인 백업을 기대함 | §3.5 — 정지 후 덤프만 가능하다는 제약을 그대로 받아들인다 |
| `depends_on`이 컨테이너 기동만 보장한다고 착각 | §3.3 — `condition: service_healthy` 없이는 순서 보장이 아니다 |
| 이 문서의 compose 변경을 다른 서비스(pgvector·redis·qdrant)에도 그대로 복붙 | 각 서비스는 별도로 실측 후 적용 — 이 문서는 Neo4j 전용 |
