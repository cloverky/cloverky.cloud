# 009 — LangGraph 전략: 검색 기반 RAG → 관계형 지식 그래프 에이전트

> 선행 문서: [[004-langgraph-harness]] (그래프 설계·배치·보안 규칙 — **절대 규칙**),
> [[002-neo4j-harness]] (그래프 저장 규칙), [[008-neo4j-strategy]] (Neo4j 컨테이너 전략)
>
> [[004-langgraph-harness]]가 **무엇을 어떻게 만드는지**를 고정했다면, 이 문서는
> **지금 상태에서 거기까지 어떤 순서로 가는지**를 고정한다. 004와 겹치는 내용(StateGraph 코드,
> 노드 구성, 디스패처 배치)은 여기서 반복하지 않고 참조한다.

---

## 0. 이 문서가 다루는 것 / 다루지 않는 것

| 다룬다 | 다루지 않는다 (→ 참조) |
| ------ | --------------------- |
| 확장 단계별 순서와 각 단계의 성공 기준 | `RagState`·`StateGraph` 구체 코드 → [[004-langgraph-harness]] §3 |
| 레퍼런스 전략과 이 저장소 실측의 차이 해소 | 포트/어댑터 배치 → [[004-langgraph-harness]] §4 |
| 선결 결정 사항 (사용자 승인 필요 항목) | Neo4j 컨테이너 설정(APOC·헬스체크) → [[008-neo4j-strategy]] |
| 단계별 안티패턴 | 라벨·관계 모델링 규칙 → [[002-neo4j-harness]] |

---

## 1. 현재 상태 (실측, 2026-07)

레퍼런스 전략은 "pgVector 단독 RAG에서 출발"을 가정하지만, **이 저장소는 이미 그 지점을 지났다.**

### 1.1 이미 존재하는 것

| 구성 요소 | 위치 | 상태 |
| --------- | ---- | ---- |
| 그래프 저장소 포트 | `star_craft/app/ports/output/graph_repository.py` | ✅ 존재 |
| Neo4j 어댑터 | `star_craft/adapter/outbound/graph/neo4j_graph_repository.py` | ✅ 존재 |
| 벡터 저장소 포트 | `star_craft/app/ports/output/vector_repository.py` | ✅ 존재 |
| 벡터 어댑터 | `star_craft/adapter/outbound/vector/qdrant_vector_repository.py` | ✅ **Qdrant** (pgVector 아님) |
| Hub 오케스트레이션 | `star_craft/app/use_cases/hub_interactor.py`, `dependencies/hub.py` | ✅ 존재 |
| 시멘틱 라우팅 | `admin/app/use_cases/semantic_chat_interactor.py` + `star_craft`의 `SemanticRouterInteractor` | ✅ 3분류 동작 (`crud` / `exaone_rag` / `gemini`) |
| 온톨로지 | `star_craft/domain/ontology/{mail,spam}/` | ✅ 택소노미·룰 존재 |
| Neo4j 컨테이너 | `docker-compose.yaml` (`neo4j:5-community`, 7474·7687) | ✅ 기동 중 |

### 1.2 의존성 (`clover/requirements.txt` 선언 기준)

```text
langchain==1.3.11        neo4j>=5.18.0
langgraph==1.2.6         neo4j-graphrag>=1.0.0
                         qdrant-client>=1.9.0
                         pgvector==0.3.6
```

- **`langchain-neo4j`는 선언돼 있지 않다** — 레퍼런스 전략이 권하는 통합 패키지. §5-①에서 결정한다.
- 위 패키지들은 Docker 이미지/venv 기준이며, 맨 `python3` 환경에는 설치돼 있지 않다(정상).

### 1.3 아직 없는 것

| 항목 | 근거 |
| ---- | ---- |
| 엔티티·관계 자동 추출 (Ingestion 고도화) | PDF 파이프라인이 문서 단위 요약 노드만 생성 — [[004-langgraph-harness]] §7에 이미 "미구현·별도 결정" 으로 명시 |
| LangGraph 그래프 조립 | `adapter/outbound/langgraph/` 디렉터리 없음 |
| destination별 체인 디스패처 | `SemanticChatInteractor`가 항상 단일 `ChatChainPort` 호출 |

---

## 2. 레퍼런스 전략 ↔ 이 저장소: 충돌 해소

**아래 4건은 레퍼런스를 그대로 따르면 기존 하네스를 위반한다.** 이 문서의 결정이 우선한다.

| # | 레퍼런스 전략 | 이 저장소의 결정 | 근거 |
| - | ------------- | ---------------- | ---- |
| ① | "pgVector → Neo4j 로 이전" | **pgVector는 애초에 RAG 경로가 아니다.** 벡터 검색은 `QdrantVectorRepository`가 담당한다. pgVector(`pgvector==0.3.6`)는 `apps/messenger`의 메일 ORM에서만 쓰인다 — 건드리지 않는다. | 실측 §1.1 |
| ② | "`GraphCypherQAChain` / Text-to-Cypher 로 자연어→Cypher 변환" | **기본값으로 채택하지 않는다.** `retrieve` 노드는 포트의 **고정 Cypher**만 사용한다. 정말 필요하면 읽기 전용 화이트리스트(`MATCH ... RETURN`만)로 제한하고 별도 검토를 받는다. | [[004-langgraph-harness]] §5 — LLM 생성 Cypher는 [[002-neo4j-harness]] §6의 파라미터 바인딩 원칙을 우회하는 주입 경로 |
| ③ | "1단계: Neo4j 설치" | **이미 완료.** 남은 것은 APOC 플러그인·헬스체크·이미지 태그 고정이며 그것은 [[008-neo4j-strategy]]의 범위다. | 실측 §1.1 |
| ④ | "pgVector와 Neo4j를 함께 호출하는 하이브리드로 시작" | 방향은 채택하되 조합 지점이 다르다. **하이브리드는 `star_craft`(Hub) 안에서** `GraphRepository` + `VectorRepository`를 조합하고, `admin`은 Hub 포트 하나만 호출한다. | 스타 토폴로지 — 스포크가 자체 드라이버를 신설하지 않는다 ([[002-neo4j-harness]] §4) |

> ④가 특히 중요하다. 레퍼런스처럼 "LangGraph 노드 안에서 두 저장소를 직접 호출"하면
> `admin`이 Neo4j·Qdrant 드라이버에 직접 의존하게 되어 Hub를 우회한다.
> **노드는 포트를 호출하고, 저장소 조합은 Hub 뒤에 숨긴다.**

---

## 3. 4단계 확장 프로세스 → 이 저장소 대응

레퍼런스의 4단계를 실측 상태에 맞춰 재배치한 것이다.

### 1단계 — 지식 그래프 스키마 확정 (Ingestion 설계)

레퍼런스의 "Neo4j 설치 + `LLMGraphTransformer` 자동 추출" 중 **설치는 완료**, 추출이 남았다.

- 추출 대상 엔티티·관계 타입을 **먼저 문서로 고정**한다. `star_craft/domain/ontology/`의
  기존 택소노미(mail·spam) 패턴을 따라 새 온톨로지 모듈로 선언한다.
- `LLMGraphTransformer`는 라벨·관계 타입을 LLM이 즉흥적으로 만들게 하므로,
  **허용 라벨/관계 화이트리스트를 반드시 주입**한다 ([[002-neo4j-harness]]의 식별자 검증 원칙).
- 쓰기는 `GraphRepository` 포트 경유. 스포크가 드라이버를 직접 잡지 않는다.

> ⚠️ 스키마 없이 자동 추출부터 돌리면 라벨이 난립해 이후 고정 Cypher를 쓸 수 없게 된다.
> 이 단계의 산출물은 **코드가 아니라 온톨로지 문서**다.

### 2단계 — Hub에 하이브리드 검색 포트 추가

`admin`이 아니라 **`star_craft`에** 다음을 추가한다.

- 벡터 검색으로 유사 문맥 후보를 뽑고(`VectorRepository`), 그 문맥에 연결된 관계망을
  고정 Cypher로 확장해(`GraphRepository`) 하나의 근거 묶음으로 반환하는 포트.
- `admin`은 이 포트 **하나만** 주입받는다 — 두 저장소의 존재를 몰라도 된다.
- 반환 타입은 DTO. Neo4j `Record`·Qdrant `ScoredPoint` 같은 드라이버 타입이 포트 경계를 넘지 않는다.

### 3단계 — LangGraph 그래프 조립

구조는 [[004-langgraph-harness]] §3(`retrieve → grade → (retry | answer)`)을 **그대로** 쓴다.
이 문서가 추가로 고정하는 것은 배치뿐이다.

- `StateGraph` 조립·`compile()`은 `adapter/outbound/langgraph/`에서만.
- 경계는 `GraphRagChainPort` — `RagState`·`StateGraph` 타입 노출 금지.
- `attempts >= MAX_ATTEMPTS` 강제 종료 경로 필수 (무한 루프 가드레일).

### 4단계 — 디스패치 결선 및 평가

- `destination == "exaone_rag"` 만 그래프 경로로 보낸다. `crud`·`gemini`는 기존 선형 체인 유지
  (불필요한 순환 비용 회피).
- `SemanticChatInteractor`와 `ChatChainPort` 시그니처는 **한 줄도 바꾸지 않는다**
  ([[004-langgraph-harness]] §4의 `DestinationDispatchChatChain` 패턴).
- 평가는 다단계 추론 질문(multi-hop)으로 한다. "A와 B의 관계" 처럼 벡터 유사도만으로는
  답할 수 없는 질문을 벤치마크로 고정해 그래프 경로가 실제로 이득인지 확인한다.

---

## 4. 단계별 성공 기준

각 단계는 아래를 통과하기 전에 다음 단계로 넘어가지 않는다.

| 단계 | 성공 기준 |
| ---- | --------- |
| 1 | 허용 라벨·관계 타입 목록이 문서로 존재하고, 화이트리스트 밖 라벨 주입 시 거부됨 |
| 2 | Hub 포트가 벡터 후보 + 관계 확장을 하나의 DTO로 반환. `admin`에서 `neo4j`/`qdrant_client` import 0건 |
| 3 | 스텁 포트로 `compiled.ainvoke()`가 문자열 반환. `sufficient=False` 고정 스텁에서 `MAX_ATTEMPTS`회 후 정확히 `answer`로 종료 |
| 4 | `destination="exaone_rag"` → 그래프 경로, 그 외 → 선형 체인 (모킹으로 호출처 확인). `SemanticChatInteractor` diff 없음 |

공통 하네스:

```bash
cd clover && ruff check apps/admin apps/star_craft && ruff format --check apps/admin apps/star_craft
cd clover && mypy apps/admin apps/star_craft --config-file pyproject.toml
cd clover && python3 -m importlinter
cd clover && python3 -c "import main"
```

> `python3`을 쓴다 — 이 환경에는 `python` 이 없다.

---

## 5. 선결 결정 사항 (착수 전 사용자 승인 필요)

| # | 항목 | 쟁점 |
| - | ---- | ---- |
| ① | `langchain-neo4j` 의존성 추가 여부 | 레퍼런스가 권하지만 `requirements.txt`에 없다. 이미 `neo4j-graphrag>=1.0.0`이 있어 **기능이 겹칠 가능성**이 있다. 추가 시 이미지 크기·버전 충돌 검토 필요 |
| ② | `admin`을 `.importlinter` `root_packages`에 등록할지 | **현재 `admin`은 미등록이라 스타 토폴로지 검사를 받지 않는다.** 등록하지 않으면 2단계의 "admin에서 드라이버 import 금지"를 린터가 강제하지 못하고 사람 눈에만 의존한다 |
| ③ | Ingestion 트리거 | 엔티티·관계 추출을 어느 시점에 돌릴지 (PDF 업로드 시 동기 / 배치 / 온디맨드). LLM 호출량과 직결되므로 **비용 영향 확인 필요** |
| ④ | `langgraph_interactor.py` 빈 스텁 처리 | [[004-langgraph-harness]] §4는 "이 목적으로는 쓰지 않는다, 삭제 제안" 으로 결론냈다. 삭제할지 유지할지 |

---

## 6. 안티패턴

| 안티패턴 | 올바른 방향 |
| -------- | ----------- |
| `admin`에서 `neo4j`·`qdrant_client` 드라이버 직접 import | Hub(`star_craft`) 포트 경유 — §2-④ |
| 스키마 확정 없이 `LLMGraphTransformer` 부터 실행 | 1단계 산출물은 온톨로지 문서. 라벨 난립 후엔 고정 Cypher를 쓸 수 없다 |
| `GraphCypherQAChain`으로 자연어→Cypher 직행 | 고정 Cypher 또는 읽기 전용 화이트리스트 — §2-② |
| pgVector를 Neo4j로 "마이그레이션" | pgVector는 `apps/messenger` 전용. RAG 벡터는 Qdrant — §2-① |
| 하이브리드 검색을 LangGraph 노드 안에서 조합 | 조합은 Hub 안에서. 노드는 포트 하나만 호출 |
| `crud`·`gemini`까지 그래프 경로로 태움 | `exaone_rag` 만. 다단계 추론이 불필요한 경로에 순환 비용을 들이지 않는다 |
| 이 확장을 위해 새 유스케이스·인터랙터 신설 | `ChatChainPort` 구현체 교체로 충분 — [[004-langgraph-harness]] §4 |
| 종료 조건 없는 조건부 엣지 | `attempts` 카운터로 강제 종료 경로 확보 |
