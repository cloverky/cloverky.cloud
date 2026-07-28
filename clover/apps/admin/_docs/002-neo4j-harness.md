# 002 — Neo4j 그래프 DB 운영 하네스

> 목적: 그래프 DB를 "감으로" 다루지 않기 위한 계약서.
> 모델 정의 → 네이밍 규칙 → 코드 배치 → 검증 명령까지를 하나의 하네스로 고정한다.
> 루트 `CLAUDE.md`(Top-Level Architecture Mandate)와 `clover/CLAUDE.md`(스타 토폴로지)를 먼저 읽는다.

---

## 1. 그래프 데이터 모델 기본

그래프 데이터는 **노드(node)**, **라벨(label)**, **관계(relationship)**, **속성(property)** 으로 정의된다.
이 중 **노드와 관계가 그래프를 구성하는 기본 단위**다.

| 구성 요소 | 정의 | 이 저장소에서의 의미 |
|-----------|------|---------------------|
| **노드 (node)** | 그래프에서 동그라미로 그려지는 각각의 것. 엔티티를 식별한다. | 식재료, 사용자, 레시피, 에이전트 등 도메인 엔티티 1건 |
| **라벨 (label)** | 노드에 붙는 분류 이름 (`Person`, `Book`). 한 노드가 여러 라벨을 가질 수도 있다. | 바운디드 컨텍스트의 유비쿼터스 언어를 그대로 사용 |
| **관계 (relationship)** | 두 노드를 연결하며 화살표로 방향을 표현한다. | `:HAS_READ`, `:IS_FRIENDS_WITH` 처럼 **동사**로 표현 |
| **속성 (property)** | 노드와 **관계 모두**에 설명을 붙이는 키-값. | `name`, `age`, 관계의 `on`(발생일) 등 |

### 예시 — Person / Book

두 명의 사람(`Person`)이 하나의 책(`Book`)을 "읽었다"는 관계는 `:HAS_READ`로,
두 사람이 "친구다"라는 관계는 `:IS_FRIENDS_WITH`로 연결한다.
`Person` 노드는 `name`, `age` 속성으로 각 노드를 식별하고,
"언제 읽었는지"는 **관계의 속성** `on`에 저장한다.

```text
(Person {name:"소연", age:30}) -[:HAS_READ {on: date("2026-07-01")}]-> (Book {title:"그래프 DB"})
        |                                                                      ^
   [:IS_FRIENDS_WITH]                                                          |
        v                                                                      |
(Person {name:"지호", age:28}) -[:HAS_READ {on: date("2026-07-20")}]-----------+
```

```cypher
MERGE (a:Person {name: $a_name}) SET a.age = $a_age
MERGE (b:Person {name: $b_name}) SET b.age = $b_age
MERGE (book:Book {title: $title})

MERGE (a)-[r1:HAS_READ]->(book) SET r1.on = date($a_read_on)
MERGE (b)-[r2:HAS_READ]->(book) SET r2.on = date($b_read_on)
MERGE (a)-[:IS_FRIENDS_WITH]-(b)
```

**판단 기준 — 속성인가 노드인가**

- 그 값으로 **다른 엔티티와 연결할 일이 없다** → 속성 (`age`, `on`)
- 그 값 자체를 **검색·집계·연결의 대상**으로 삼는다 → 노드 + 관계 (`Book`, `Category`)
- 관계에만 의미가 있는 값(읽은 날짜, 신뢰도, 수량)은 **관계 속성**에 둔다. 중간 노드를 만들지 않는다.

---

## 2. 네이밍 규칙 (강제)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 라벨 | `PascalCase` 단수 | `Person`, `Book`, `Ingredient` |
| 관계 타입 | `UPPER_SNAKE_CASE` 동사구 | `HAS_READ`, `IS_FRIENDS_WITH`, `EXPIRES_ON` |
| 속성 | `snake_case` | `name`, `age`, `read_on` |
| 식별 속성 | 라벨마다 `name` 또는 `id` **하나로 고정** | `MERGE (n:Person {name: $name})` |

- 관계 방향은 **의미가 있는 쪽으로 한 번만** 만든다. 양방향 중복 생성 금지
  (`IS_FRIENDS_WITH`처럼 대칭 관계는 방향 없이 `MERGE (a)-[:R]-(b)`로 한 번만).
- 라벨·관계 타입은 **Cypher 파라미터로 바인딩할 수 없다.** 반드시 식별자 형태를 검증한 뒤 문자열로 삽입한다
  (`star_craft/adapter/outbound/graph/neo4j_graph_repository.py`의 `_validate_identifier`).

---

## 3. 운영 구성

| 항목 | 값 |
|------|-----|
| 이미지 | `neo4j:5-community` (`docker-compose.yaml` 서비스명 `neo4j`) |
| 포트 | `7474` (HTTP Browser), `7687` (Bolt) |
| 볼륨 | `neo4j_data:/data` — 컨테이너를 재생성해도 데이터 유지 |
| 인증 | compose `NEO4J_AUTH=neo4j/<password>` |
| 브라우저 | <http://localhost:7474> |
| 백엔드 의존 | `backend.depends_on: [pgvector, redis, neo4j]` |

### 환경 변수 (`clover/.env`)

```dotenv
NEO4J_URI=bolt://neo4j:7687   # 컨테이너 내부에서는 서비스명. 호스트에서 직접 실행 시 bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<compose의 NEO4J_AUTH와 동일>
```

컨테이너 안에서 `localhost:7687`은 **백엔드 자신**을 가리킨다. 연결 실패 시 이 값을 가장 먼저 의심한다.

### 의존 패키지 (`clover/requirements.txt`)

```text
neo4j>=5.18.0          # 공식 드라이버 (Async)
neo4j-graphrag>=1.0.0  # 그래프 RAG (retriever, 인덱스, LLM 파이프라인)
```

Docker 런타임에 반영하려면 `requirements-docker.txt`에도 동일하게 추가한 뒤 이미지를 재빌드한다.

---

## 4. 코드 배치 — 포트 & 어댑터

그래프 접근은 **star_craft(Hub)의 포트/어댑터 한 곳**을 통해서만 한다.

```
star_craft/app/ports/output/graph_repository.py              # GraphRepository ABC (포트)
star_craft/adapter/outbound/graph/neo4j_graph_repository.py  # Neo4jGraphRepository (어댑터)
```

```python
class GraphRepository(ABC):
    async def upsert_node(self, label: str, props: dict[str, Any]) -> str: ...
    async def upsert_relation(
        self, from_id: str, to_id: str, rel_type: str
    ) -> None: ...
    async def query(
        self, cypher: str, params: dict[str, Any]
    ) -> list[dict[str, Any]]: ...
```

### 스타 토폴로지 규칙

| 흐름 | 허용 |
|------|------|
| `admin`(Spoke) → `star_craft`(Hub)의 `GraphRepository` | ✅ |
| `star_craft` → Spoke | ✅ |
| Spoke → Spoke 직접 import | ❌ |
| Interactor → `neo4j` 드라이버 직접 import | ❌ — 포트만 의존 |
| 라우터·MCP 툴에서 Cypher 직접 실행 | ❌ — Interactor에 위임 |

admin은 **자체 Neo4j 드라이버를 새로 만들지 않는다.** `dependencies/`에서 `Neo4jGraphRepository`를 조립해
포트 타입(`GraphRepository`)으로 Interactor에 주입한다.

```python
def get_topology_use_case() -> TopologyUseCase:
    graph: GraphRepository = Neo4jGraphRepository()
    return TopologyInteractor(graph=graph)
```

### 그래프 스키마 정의 위치

라벨·관계 타입의 **단일 정의처**는 도메인 모듈에 둔다 (admin의 경우
`admin/domain/piper_hendricks_ceo_topology.py`). 문자열 리터럴을 어댑터·Interactor에
흩뿌리지 않는다.

---

## 5. 하네스 — 검증 절차

그래프 관련 코드를 수정한 뒤 **반드시** 아래를 통과시킨다.

```bash
# 1) 정적 검사 (루트 CLAUDE.md 하네스)
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml

# 2) 의존성 토폴로지 (Spoke → Spoke 위반 탐지)
cd clover && python -m importlinter
python scripts/validate-harness.py

# 3) import 스모크
cd clover && python -c "import main"

# 4) 그래프 연결 스모크
docker exec cloverkycloud-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASSWORD" "RETURN 1 AS ok;"

# 5) 스키마 확인 — 실제로 어떤 라벨/관계가 생겼는지
docker exec cloverkycloud-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASSWORD" "CALL db.labels();"
docker exec cloverkycloud-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASSWORD" "CALL db.relationshipTypes();"
```

### 성공 기준 (Goal-Driven Execution)

| 작업 | 검증 |
|------|------|
| 새 라벨·관계 추가 | `db.labels()` / `db.relationshipTypes()`에 **의도한 이름만** 등장 |
| upsert 구현 | 같은 입력을 2회 실행해도 노드·관계 수가 증가하지 않음 (멱등성) |
| 조회 쿼리 추가 | 빈 그래프에서 `[]`, 시드 데이터에서 기대 레코드 수 반환 |
| 인덱스·제약 추가 | `SHOW INDEXES` / `SHOW CONSTRAINTS`에 ONLINE 상태로 등장 |

### 멱등성 확인 쿼리

```cypher
MATCH (n) RETURN labels(n) AS label, count(*) AS cnt ORDER BY label;
MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS cnt ORDER BY rel;
```

---

## 6. 운영 규칙

- **MERGE 우선.** `CREATE`는 중복 노드를 만든다. 식별 속성 기준 `MERGE` 후 `SET n += $props`.
- **식별 속성에 제약·인덱스를 건다.** 데이터가 늘기 전에 선언한다.

  ```cypher
  CREATE CONSTRAINT person_name IF NOT EXISTS
  FOR (p:Person) REQUIRE p.name IS UNIQUE;
  ```

- **값은 항상 파라미터로.** f-string으로 값을 문자열에 끼워 넣지 않는다 (Cypher 인젝션).
  라벨·관계 타입만 예외이며, 이때는 식별자 정규식 검증이 필수다.
- **삭제는 관계까지.** `DETACH DELETE`를 쓰되, 범위 없는 `MATCH (n) DETACH DELETE n`은 금지.
- **드라이버 수명.** 현재 어댑터는 호출마다 드라이버를 열고 닫는다. 고빈도 경로에서 병목이 되면
  드라이버를 애플리케이션 수명으로 승격하되 **어댑터 내부에서만** 처리한다(포트 시그니처 불변).

---

## 7. 안티패턴 (즉시 반려)

| 안티패턴 | 올바른 방향 |
|----------|------------|
| Interactor에서 `from neo4j import ...` | `GraphRepository` 포트만 주입 |
| 라우터·MCP 툴에 Cypher 문자열 | Interactor로 이동 |
| Spoke가 자체 Neo4j 드라이버 신설 | Hub(`star_craft`)의 어댑터 재사용 |
| 라벨·관계 타입을 사용자 입력 그대로 삽입 | `_validate_identifier` 통과 필수 |
| 관계에 담을 값을 위해 중간 노드 생성 | 관계 속성 사용 (`{on: ...}`) |
| 관계를 양방향 두 개로 생성 | 방향 하나 또는 무방향 `MERGE (a)-[:R]-(b)` |
| RDB 조인 감각으로 모든 것을 노드화 | 검색·연결 대상만 노드, 나머지는 속성 |
| 스키마 변경 후 문서 미갱신 | 이 문서와 도메인 스키마 모듈을 함께 갱신 |
