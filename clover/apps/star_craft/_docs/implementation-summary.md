# star_craft 작업 총정리

이번 세션에서 star_craft(허브)에 추가된 것들을 **실제 구현된 코드**와 **문서(계획/참고)만
존재하는 것**으로 나눠 정리한다.

---

## 1. 실제 구현된 코드

### 1-1. Hub — Graph DB(Neo4j) · Vector DB(Qdrant) 파이프라인

`star-craft-pipeline.md`에 이미 설계되어 있던 계획(3~11단계)을 따라 구현했다.

| 레이어 | 파일 |
|--------|------|
| DTO | `app/dtos/graph_dto.py`, `app/dtos/vector_dto.py` |
| Port (input) | `app/ports/input/hub_use_case.py` |
| Port (output) | `app/ports/output/graph_repository.py`, `app/ports/output/vector_repository.py` |
| Adapter | `adapter/outbound/graph/neo4j_graph_repository.py`, `adapter/outbound/vector/qdrant_vector_repository.py` |
| Interactor | `app/use_cases/hub_interactor.py` |
| DI | `dependencies/hub.py` |
| Router | `adapter/inbound/api/v1/hub_router.py` → `POST /api/star_craft/hub/relations`, `/hub/recipes/search` |

의존성: `requirements.txt` / `requirements-docker.txt`에 `neo4j`, `qdrant-client` 추가.
`.env`에 `NEO4J_URI`, `NEO4J_USER`, `QDRANT_HOST`, `QDRANT_PORT` 추가 (gitignore됨).

### 1-2. 이미지 분류 — EfficientNetV2-S 추론 코어

`observer-agent.md` 지시서 중 **추론 코어만** 헥사고날 구조로 재구성해서 구현했다
(LangGraph 에이전트/Tool wrapper, 전역 레지스트리 DI, 2단계 fine-tuning 트레이너는 제외 —
`apps/vision/app/use_cases/yolo_interactor.py` 패턴과 맞지 않아서 뺐다).

| 레이어 | 파일 |
|--------|------|
| DTO | `app/dtos/image_classifier_dto.py` |
| Port (input) | `app/ports/input/image_classifier_use_case.py` |
| Port (output) | `app/ports/output/image_model_gateway.py` |
| 순수 로직 | `domain/value_objects/classification_result.py` (레이블 매핑 + 신뢰도 임계값 해석) |
| Adapter | `adapter/outbound/torch/efficientnetv2s_gateway.py` (timm `tf_efficientnetv2_s`) |
| Interactor | `app/use_cases/image_classifier_interactor.py` |
| DI | `dependencies/image_classifier_provider.py` (모델 게이트웨이 `lru_cache`) |
| Router | `adapter/inbound/api/v1/image_classifier_router.py` → `POST /api/star_craft/image-classifier/classify` |
| 테스트 | `tests/domain/value_objects/test_classification_result.py`, `tests/app/use_cases/test_image_classifier_interactor.py` (Fake 게이트웨이 사용, GPU 불필요) |

의존성: `requirements-docker.txt`에 `torchvision`, `timm` 추가
(`requirements.txt`에는 이미 있었음).

---

## 2. 문서(계획/참고)만 존재 — 코드 미구현

| 문서 | 내용 | 비고 |
|------|------|------|
| [`../../_docs/pyproject-toml.md`](../../_docs/pyproject-toml.md) | `onprem-agent-mcp` 독립 프로젝트 스펙 (Ollama+MCP+Neo4j) | 실제로는 위 1-1 Hub 구현으로 대체됨 |
| [`observer-agent.md`](./observer-agent.md) | EfficientNetV2-S + LangGraph 에이전트 전체 스펙 | 추론 코어만 1-2로 구현, 나머지는 미구현 |
| [`onnx-directml-multi-agent-pipeline.md`](./onnx-directml-multi-agent-pipeline.md) | 8개 비전/텍스트 에이전트 (ONNX+DirectML, Iris Xe 대상) 개요 | 전체 미구현 |
| [`overseer-image-class-agent.md`](./overseer-image-class-agent.md) | Overseer — 이미지 분류 (MobileNetV3-Small) | 미구현 |
| [`raven-detection-agent.md`](./raven-detection-agent.md) | Raven — 물체 감지 (YOLOv8n) | 미구현 |
| [`science-vessel-segmentation-agent.md`](./science-vessel-segmentation-agent.md) | ScienceVessel — 시멘틱 분할 (SegFormer-B0) | 미구현 |
| [`ghost-pose-agent.md`](./ghost-pose-agent.md) | Ghost — 자세 추정 (RTMPose-tiny) | 미구현 |
| [`reaver-generation-agent.md`](./reaver-generation-agent.md) | Reaver — 이미지 생성 (SD-1.5) | 미구현 |
| [`arbiter-anomaly-agent.md`](./arbiter-anomaly-agent.md) | Arbiter — 이상 탐지 (PatchCore) | 미구현 |
| [`comsat-sentiment-agent.md`](./comsat-sentiment-agent.md) | Comsat — 감정 분석 (DistilBERT) | 미구현 |
| [`battlecruiser-video-agent.md`](./battlecruiser-video-agent.md) | Battlecruiser — 동영상 분류 (VideoMAE-tiny) | 미구현 |
| [`nexus-supervisor-agent.md`](./nexus-supervisor-agent.md) | Nexus — Supervisor 라우팅 | 미구현 |

---

## 3. 확인이 필요한 충돌·미검증 사항

- **하드웨어 가정 충돌**: `onnx-directml-multi-agent-pipeline.md`는 "CUDA 없음 → Iris Xe/DirectML"을
  전제로 하지만, `clover/requirements.txt`는 이미 `torch==2.12.0+cu126` (CUDA 빌드)을 고정하고 있다.
  이 파이프라인을 실제로 구현하기 전에 배포 대상 하드웨어를 먼저 확인해야 한다.
- **하네스 미실행**: 이번 세션 환경에는 `pip`/venv가 없어 `ruff check --fix`, `ruff format`,
  `mypy`, `pytest apps/star_craft/tests/`를 직접 실행하지 못했다. 커밋 전 로컬/CI에서 반드시
  돌려서 확인할 것.
- **레이블 맵 미정**: `image_classifier_provider.py`의 `EFFICIENTNETV2S_LABEL_MAP_PATH`,
  `EFFICIENTNETV2S_WEIGHTS_PATH`는 아직 실제 학습된 가중치·클래스 매핑이 없어 기본값
  (pretrained ImageNet, 빈 레이블 맵)으로 동작한다.
