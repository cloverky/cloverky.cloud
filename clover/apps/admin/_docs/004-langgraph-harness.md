# 004 — LangGraph 하네스: 시멘틱 라우터의 `exaone_rag` 에스컬레이션

> 선행 문서: [[003-langchain-harness]] (LangChain 사용 규칙), [[002-neo4j-harness]] (그래프 저장 규칙)
> 이 문서는 **왜/언제 LangGraph로 확장하는지**와 **이 저장소에서 그 확장이 정확히 어디에 꽂히는지**를 고정하는 하네스다.
> `apps/admin/app/use_cases/langgraph_interactor.py`는 현재 빈 스텁이다 — §6에서 이 파일을 쓸지 말지 결정한다.

---

## 0. 왜 LangChain 선형 체인만으로는 부족한가

LangChain의 체인(`prompt | RunnableLambda | Parser`, [[003-langchain-harness]] §5)은
**A → B → C로 한 방향으로만 흐르는 강물**이다. 이 구조로는 표현할 수 없는 것들이 있다.

| 한계 | 구체적 증상 |
|------|-------------|
| 조건 분기 | "검색 결과가 부실하면 다른 경로로" 같은 런타임 분기가 없다 |
| 순환(Loop) | "답이 부족하면 검색 단계로 되돌아가기"를 표현할 수 없다 — 체인은 되돌아가지 않는다 |
| 정교한 상태 관리 | 대화 기록뿐 아니라 중간 판단·검색 문서·남은 재시도 횟수를 그래프 전체가 공유·갱신할 방법이 없다 |
| 자기수정(Self-correction) | 오류·불충분한 근거를 스스로 감지해 재시도하는 로직을 넣을 자리가 없다 |
| 멀티 에이전트 협업 | 리서치 담당·검증 담당·답변 작성 담당처럼 역할이 나뉜 노드들이 상호작용하는 구조를 표현할 수 없다 |

**LangGraph**는 파이프라인을 **State(공유 상태) + Node(작업 단위) + Edge(전이, 조건부 가능)** 로 모델링해
이 문제들을 해결한다. 노드는 순수 함수(또는 LLM 호출)이고, 엣지는 조건에 따라 다음 노드를 고르거나
이전 노드로 되돌아갈 수 있다 — 이것이 순환과 자기수정을 가능하게 하는 핵심이다.

---

## 1. GraphRAG — Neo4j를 추론 인프라로 쓰는 이유

GraphRAG는 비구조화 텍스트에서 **엔티티(노드)**와 **관계(엣지)**를 추출해 지식 그래프를 만들고,
이를 근거로 **정확도 높은 검색 + 다단계 추론(Multi-hop Reasoning)**을 수행하는 기법이다.

| 단계 | 설명 | 이 저장소의 대응 |
|------|------|------------------|
| 지식 그래프 구축(Ingestion) | 문서에서 노드·관계를 추출해 그래프에 저장 (`LLMGraphTransformer` 등) | 현재는 PDF 파이프라인이 문서 단위 요약만 `(:PdfDocument)`로 저장 — 엔티티·관계 추출은 **미구현** (§7 참고) |
| Text-to-Cypher | 자연어 질문을 LLM이 Cypher로 변환 (`GraphCypherQAChain` 류) | **이 저장소에서는 기본적으로 사용하지 않는다** — §5 보안 참고 |
| 그래프 탐색·하이브리드 검색 | Cypher로 다중 홉 이웃 조회 + 벡터 인덱스 결합 | `star_craft`의 `GraphRepository.query()` + `QdrantVectorRepository` (허브에 이미 존재) |
| 정교한 답변 생성 | 그래프에서 뽑은 명시적 관계·맥락을 LLM에 주입해 환각 없는 답변 생성 | 이 문서 §3의 `answer` 노드 |

Neo4j는 **관계 자체가 1급 데이터**라는 점에서 벡터 검색만으로는 못 잡는 "A가 B와 어떤 관계인가"류
질문(다단계 추론)에 강하다. 라벨·관계·속성 모델링 규칙은 [[002-neo4j-harness]]를 그대로 따른다.

---

## 2. 트리거 지점 — 이 저장소에서 언제 LangGraph로 넘어가는가

이미 구현된 시멘틱 라우팅 파이프라인(`admin/app/use_cases/semantic_chat_interactor.py`)이
`star_craft`(Hub)의 `SemanticRouterInteractor`를 통해 질문을 3갈래로 분류한다:

```
crud        — 데이터 생성/수정/삭제 요청
exaone_rag  — 스타 토폴로지 노드 관계·사내 전문 도메인 지식 질문   ← 여기서 escalate
gemini      — 일상 대화·일반 상식
```

`exaone_rag`로 분류된 질문은 **정의상 "다단계 추론이 필요한 질문"** 이다 — 정확히 GraphRAG가 잘하는 일이다.
반면 `crud`·`gemini`는 선형 체인으로 충분하다(불필요한 순환 비용을 들일 이유가 없다).

```
질문 → SemanticRouterPort.classify()
         │
         ├─ destination == "exaone_rag"  → LangGraph GraphRAG 루프 (이 문서)
         └─ destination in {crud, gemini} → 기존 SemanticChatChain (LCEL, 003 하네스)
```

현재 `SemanticChatInteractor.chat()`(`app/use_cases/semantic_chat_interactor.py`)은
분류 결과와 무관하게 항상 하나의 `ChatChainPort`(`SemanticChatChain`)를 호출한다.
이 하네스가 정의하는 확장은 **그 호출 지점 하나**에서 갈라진다.

---

## 3. 그래프 설계 — retrieve → grade → (retry | answer)

자기수정 루프의 최소 구성. 상태는 대화 기록이 아니라 **이 질문 하나를 처리하는 동안의 작업 상태**다.

```python
from typing import TypedDict

class RagState(TypedDict):
    question: str
    entities: list[str]        # SemanticRouterPort.classify()가 뽑은 핵심 단어 — 초기 검색 키워드
    context: str                # 지금까지 모은 근거 (research_context 문자열)
    sufficient: bool            # grade 노드의 판단
    attempts: int                # 재시도 횟수 (무한 루프 방지)
    answer: str
```

```python
MAX_ATTEMPTS = 3

async def retrieve(state: RagState) -> RagState:
    # ResearchRepositoryPort(002 하네스의 GraphRepository 경유) — 재시도마다 키워드를 넓혀간다
    excerpts = await research.search(state["entities"], limit=5)
    return {**state, "context": research_context(excerpts), "attempts": state["attempts"] + 1}

async def grade(state: RagState) -> RagState:
    # ChatLlmPort에게 "이 컨텍스트로 질문에 답할 수 있는가"만 묻는 짧은 판단 호출
    verdict = await chat.complete(_GRADE_PROMPT, f"질문: {state['question']}\n근거: {state['context']}")
    return {**state, "sufficient": verdict.strip().startswith("SUFFICIENT")}

def route_after_grade(state: RagState) -> str:
    if state["sufficient"] or state["attempts"] >= MAX_ATTEMPTS:
        return "answer"
    return "retrieve"  # 순환 — 선형 체인이 못 하는 부분

async def answer(state: RagState) -> RagState:
    reply = await chat.complete(_ANSWER_PROMPT, f"질문: {state['question']}\n근거: {state['context']}")
    return {**state, "answer": reply}
```

```python
from langgraph.graph import StateGraph, START, END

graph = StateGraph(RagState)
graph.add_node("retrieve", retrieve)
graph.add_node("grade", grade)
graph.add_node("answer", answer)
graph.add_edge(START, "retrieve")
graph.add_edge("retrieve", "grade")
graph.add_conditional_edges("grade", route_after_grade, {"retrieve": "retrieve", "answer": "answer"})
graph.add_edge("answer", END)
compiled = graph.compile()
```

`attempts >= MAX_ATTEMPTS`에서 강제로 `answer`로 빠지는 것이 **가드레일**이다 — LangGraph는 순환을
허용하지만, 종료 조건 없는 순환은 그대로 무한 루프가 된다. `002-neo4j-harness.md`의
"파싱 실패 시 안전한 기본값으로 우회" 원칙과 동일한 정신이다.

---

## 4. 아키텍처 배치 (클린/헥사고날 준수)

LangGraph도 [[003-langchain-harness]] §6과 동일한 규칙을 따른다 — **프레임워크는 어댑터에만**.

```
app/ports/output/graph_rag_chain_port.py     # 순수 ABC — StateGraph 타입 노출 금지
        ↑ 구현
adapter/outbound/langgraph/graph_rag_chain.py # StateGraph 조립 + compile은 여기서만
        ↑ 주입
dependencies/semantic_chat_provider.py        # destination별로 체인을 갈라 주입하는 조립 지점
```

```python
class GraphRagChainPort(ABC):
    @abstractmethod
    async def run(self, question: str, entities: list[str]) -> str:
        """RagState 등 LangGraph 타입은 이 경계를 넘지 않는다."""
```

`ChatChainPort`(기존 003 하네스)의 시그니처(`run(message, destination, entities) -> str`)는 그대로 두고,
**목적지별로 다른 구현을 고르는 디스패처**를 어댑터 계층에 하나 추가하는 것이 가장 작은 변경이다:

```python
class DestinationDispatchChatChain(ChatChainPort):
    def __init__(self, linear: ChatChainPort, graph_rag: GraphRagChainPort) -> None:
        self._linear = linear
        self._graph_rag = graph_rag

    async def run(self, message: str, destination: str, entities: list[str]) -> str:
        if destination == "exaone_rag":
            return await self._graph_rag.run(message, entities)
        return await self._linear.run(message, destination, entities)
```

`SemanticChatInteractor`는 **한 줄도 바뀌지 않는다** — `ChatChainPort` 하나만 주입받는 계약은 그대로다.
`dependencies/semantic_chat_provider.py`의 `get_semantic_chat_use_case()`에서
`SemanticChatChain`(linear) 대신 `DestinationDispatchChatChain(linear=SemanticChatChain(...), graph_rag=LangGraphRagChain(...))`을
넘기기만 하면 된다.

### `langgraph_interactor.py`(현재 빈 스텁)에 대한 결정

이 확장은 **새로운 유스케이스가 아니라 기존 `ChatChainPort`의 새 구현**이다 — 입출력 계약이 바뀌지
않으므로 `app/use_cases/`에 별도 인터랙터가 필요 없다. 따라서:

- `langgraph_interactor.py`는 **이 목적으로는 사용하지 않는다.**
- 이 파일이 필요해지는 경우는 오직 "채팅 응답 생성이 아닌, 자체적인 입출력 계약을 가진 완전히 새로운
  LangGraph 기반 유스케이스"가 생길 때다. 그 전까지는 빈 파일로 두거나 삭제를 사용자에게 제안한다.

---

## 5. 보안 — Text-to-Cypher는 기본값이 아니다

레퍼런스의 `GraphCypherQAChain`(LLM이 자연어를 Cypher로 직접 생성해 실행)은 **강력하지만 위험하다.**
LLM이 생성한 임의 Cypher를 그대로 실행하면 [[002-neo4j-harness]] §6이 요구하는
"라벨·관계 타입은 식별자 검증, 값은 파라미터 바인딩" 원칙을 우회하는 주입 경로가 된다.

| 규칙 | 이유 |
|------|------|
| `retrieve` 노드는 **미리 정의된 Cypher**(`ResearchRepositoryPort`의 고정 쿼리)만 쓴다 | LLM이 만든 Cypher를 직접 실행하지 않는다 |
| Text-to-Cypher가 정말 필요하면 **읽기 전용 화이트리스트**(`MATCH ... RETURN`만, `MERGE`/`CREATE`/`DELETE`/`SET` 금지)로 제한하고 별도 검토를 받는다 | LLM 환각으로 인한 쓰기 오염 방지 |
| 그래프 조회는 항상 `star_craft`의 `GraphRepository` 포트를 경유한다 | 스타 토폴로지 — 자체 드라이버 신설 금지 ([[002-neo4j-harness]] §4) |

---

## 6. 설치 상태 (확인 필수)

```text
langgraph            1.2.6
langgraph-checkpoint 4.1.1   # 세션 간 상태 영속화(체크포인팅) — 필요 시 사용
langgraph-prebuilt   1.1.0   # create_react_agent 등 — 이 하네스의 범위 밖
langgraph-sdk        0.4.2
```

멀티 턴 대화에 걸쳐 `RagState`를 이어가려면(예: "아까 그 근거로 이어서") `langgraph-checkpoint`의
`MemorySaver`/영속 체크포인터를 `compile(checkpointer=...)`에 연결한다. 단발 질문-답변에는 필요 없다.

---

## 7. 이 하네스가 다루지 않는 것 (별도 결정 필요)

| 항목 | 상태 |
|------|------|
| `LLMGraphTransformer` 기반 엔티티·관계 자동 추출 (Ingestion 고도화) | 미구현. 현재 PDF 파이프라인은 문서 단위 요약 노드만 만든다 |
| 멀티 에이전트 협업(리서치·검증·작성 노드 분리) | 이 문서의 3-노드 구성 이후 확장 지점으로 남겨둔다 |
| Human-in-the-loop(사람 승인 대기) | `interrupt_before`/`interrupt_after`로 가능하나 현재 요구 없음 |

---

## 8. 검증

```bash
cd clover && ruff check apps/admin && ruff format apps/admin --check
cd clover && mypy apps/admin --config-file pyproject.toml
cd clover && python -c "import main"
```

| 항목 | 성공 기준 |
|------|-----------|
| 그래프 조립 | `compiled.ainvoke({...})`가 스텁 `ChatLlmPort`로 문자열 반환 |
| 순환 종료 | `sufficient=False`를 반환하는 스텁 grade로 `MAX_ATTEMPTS`회 후 정확히 `answer`로 빠짐 (무한 루프 아님) |
| 디스패치 | `destination="exaone_rag"` → `GraphRagChainPort` 호출, 그 외 → 기존 `SemanticChatChain` 호출 (모킹으로 어느 쪽이 불렸는지 확인) |
| 계약 불변 | `SemanticChatInteractor`, `ChatChainPort` 시그니처 diff 없음 |

---

## 9. 안티패턴

| 안티패턴 | 올바른 방향 |
|----------|------------|
| `RagState`/`StateGraph`가 `app/use_cases`나 라우터로 새어나감 | `GraphRagChainPort` 경계 밖으로 LangGraph 타입 금지 |
| LLM이 생성한 Cypher를 검증 없이 실행 | §5 — 고정 쿼리 또는 읽기 전용 화이트리스트 |
| 종료 조건 없는 조건부 엣지(무한 루프) | `attempts` 같은 카운터로 강제 종료 경로 확보 |
| `crud`/`gemini`까지 그래프로 태움 | 다단계 추론이 필요 없는 destination은 기존 선형 체인 유지 (비용·지연 최소화) |
| 이 확장을 위해 새 유스케이스/인터랙터를 만듦 | `ChatChainPort` 구현체 교체로 충분 — §4 참고 |
| `langgraph_interactor.py`를 이유 없이 채움 | §4의 결정을 따른다 — 계약이 바뀌지 않으면 새 인터랙터 불필요 |
