# 식재료 둘러보기 — 설계

작성일: 2026-08-02 · 브랜치: `soyeon`

`clover` 백엔드와 `fortune` 앱에 걸치므로 문서 배치 규칙에 따라 루트 `_docs/`에 둔다.

## 배경

앱 랜딩 화면의 `시작하기`·`문서 보기` 버튼은 `onPressed: () {}` 로 아무 동작도 하지 않는다. 눌러서 갈 화면이 앱에 없기 때문이다.

원래 목표였던 `내 냉장고`는 이번에 할 수 없다. 실제로 확인한 사실은 다음과 같다.

| 확인한 것 | 결과 |
|---|---|
| `GET /api/fridge/inventory` | **401** — 토큰을 요구한다 |
| 토큰을 읽는 곳 | `core/dependencies.py` 가 **쿠키에서만** 읽는다. `Authorization` 헤더는 보지 않는다 |
| `POST /login` | 토큰도 쿠키도 돌려주지 않는다. 이름·이메일만 반환한다 |
| 토큰 발급 경로 | `/auth/google|kakao|naver` 브라우저 리다이렉트뿐 |
| `GET /api/fridge/food/catalog` | 200이지만 라우터가 `name="사과"` 를 **하드코딩**한 스텁이다 |
| `GET /api/fridge/category/list` | 같은 형태의 스텁이다 |
| `categories` · `foods` · `inventory` 테이블 | **모두 0행** (`users` 만 4행) |

즉 인증 없이 보여줄 데이터도, 목록을 돌려주는 API도 지금은 없다.

## 목표

`시작하기` 를 누르면 실제 DB 데이터를 읽어오는 **식재료 둘러보기** 화면으로 이동한다. 로그인은 필요하지 않다.

## 확정 결정

| 항목 | 결정 |
|---|---|
| `시작하기` 목적지 | 식재료 둘러보기 화면 |
| `문서 보기` | **삭제.** 웹 히어로에는 `시작하기` 하나뿐이고 이 버튼은 웹에 없다 |
| 인증 | 필요 없음. 카탈로그는 공개 데이터다 |
| 시드 방식 | 멱등한 스크립트. Alembic 마이그레이션 이력은 건드리지 않는다 |
| 응답 모양 변경 | 안전하다. `lucky` 에 이 두 엔드포인트의 소비자가 없음을 확인했다 |

## 시드 데이터

`clover/scripts/seed_fridge_catalog.py` 를 만들어 수동으로 실행한다.

- `categories.name` 은 UNIQUE 이므로 이름으로 존재 여부를 확인하고 없을 때만 넣는다.
- `foods.name` 은 UNIQUE 가 **아니다.** `(category_id, name)` 조합으로 존재를 확인해 중복을 막는다.
- 여러 번 실행해도 결과가 같아야 한다. 실행 후 각 테이블의 행 수를 출력한다.

카테고리 8개와 식품 36개를 넣는다.

| 카테고리 | 식품 (기본 단위) |
|---|---|
| 채소 | 양파(개), 대파(단), 당근(개), 감자(개), 배추(포기) |
| 과일 | 사과(개), 바나나(개), 딸기(팩), 귤(개) |
| 육류 | 삼겹살(g), 닭가슴살(g), 소고기 등심(g), 다짐육(g) |
| 수산물 | 고등어(마리), 새우(g), 오징어(마리), 연어(g) |
| 유제품 | 우유(mL), 치즈(장), 요거트(개), 버터(g) |
| 곡물 | 쌀(kg), 밀가루(g), 국수(g), 식빵(봉) |
| 조미료 | 간장(mL), 고추장(g), 소금(g), 설탕(g), 참기름(mL) |
| 음료 | 생수(mL), 오렌지주스(mL), 탄산수(mL), 커피(mL) |

`categories.sort_order` 는 위 표의 순서대로 1부터 넣는다. 화면에서 카테고리 정렬에 쓴다.

## API

기존 스텁 두 개를 실제 목록으로 바꾼다. **경로(URL)는 유지하고 응답만 단건에서 목록으로 바뀐다.**

```
GET /api/fridge/category/list
    → [{"id": 1, "name": "채소", "sort_order": 1}, ...]        sort_order 오름차순

GET /api/fridge/food/catalog
GET /api/fridge/food/catalog?category_id=1
    → [{"id": 1, "name": "양파", "category_id": 1, "default_unit": "개"}, ...]
```

- `category_id` 는 선택이다. 없으면 전체를 이름 오름차순으로 돌려준다.
- 인증을 붙이지 않는다. 카탈로그는 사용자별 데이터가 아니다.
- 빈 목록은 오류가 아니라 `[]` 다. 시드 전에도 200 이어야 한다.

`foods.name` 과 `default_unit` 은 스키마상 nullable 이다. 목록에서 이름이 비어 있는 행은 **제외한다** — 화면에 빈 칸을 그리는 것보다 낫다.

## 백엔드 변경

`fridge` 슬라이스에는 `category` 와 `foods` 파일이 이미 다 있다. 새 슬라이스를 만들지 않고 기존 파일에 목록 경로를 더한다.

| 레이어 | 파일 | 변경 |
|---|---|---|
| DTO | `app/dtos/category_dto.py`, `foods_dto.py` | 목록 항목·응답 DTO 추가 |
| 입력 포트 | `app/ports/input/category_use_case.py`, `foods_use_case.py` | `list_categories()`, `list_foods(category_id)` 추가 |
| 출력 포트 | `app/ports/output/category_repository.py`, `foods_repository.py` | 같은 이름의 조회 메서드 추가 |
| 인터랙터 | `app/use_cases/category_interactor.py`, `foods_interactor.py` | 위임 구현 |
| 리포지토리 | `adapter/outbound/repositories/category_pg_repository.py`, `foods_pg_repository.py` | 실제 SELECT |
| 라우터 | `adapter/inbound/api/v1/category_router.py`, `foods_router.py` | 하드코딩 제거, 목록 반환 |

단건을 돌려주던 기존 핸들러 구현은 **남기지 않는다.** URL 은 같지만 하드코딩된 `name="사과"` 분기는 지운다. 소비자가 없으므로 호환을 위해 남길 이유가 없다.

`dependencies/` 는 이미 조립돼 있어 바꿀 것이 없다.

## 앱 변경

| 파일 | 책임 |
|---|---|
| `lib/catalog/catalog_api.dart` | `CatalogApi` 포트 + HTTP 구현, `Category`·`Food` 모델 |
| `lib/catalog/catalog_screen.dart` | 카테고리 칩 + 식품 목록 |
| `lib/landing_screen.dart` | `시작하기` 에 이동 연결, `문서 보기` 삭제 |

- API base 는 날씨와 같은 `--dart-define=API_BASE_URL`(기본 `https://api.cloverky.cloud`)을 쓴다. 날씨에서 만든 방식을 그대로 따른다.
- 화면 상태는 **로딩 · 결과 · 실패** 세 가지다. 실패해도 화면이 죽지 않고 다시 시도할 수 있어야 한다.
- 카테고리 칩의 맨 앞에 **`전체`** 칩을 두고 그것이 초기 선택이다. 카테고리를 고르면 그 카테고리의 식품만 보여준다.
- 목록의 각 줄은 **식품 이름과 기본 단위**를 보여준다 (예: `양파 · 개`). `default_unit` 이 비어 있으면 이름만 보여준다.
- 결과가 비면 "아직 등록된 식재료가 없어요" 를 보여준다. 시드 전에도 화면이 정상으로 보여야 한다.
- 폰트·색은 기존 `theme.dart` 토큰을 쓴다. 새 디자인 토큰을 만들지 않는다.

## 테스트

| 영역 | 대상 | 방법 |
|---|---|---|
| 백엔드 | 인터랙터가 리포지토리 결과를 그대로 전달하는지, `category_id` 가 전달되는지 | 가짜 리포지토리 주입 — DB 불필요 |
| 백엔드 | 라우터가 목록을 반환하고 `category_id` 쿼리를 넘기는지 | `TestClient` + `dependency_overrides` |
| 앱 | 로딩·결과·실패 세 상태, 카테고리 선택 시 목록이 바뀌는지 | 가짜 `CatalogApi` 주입 |

시드 스크립트는 DB 를 건드리므로 자동 테스트 대상으로 삼지 않는다. 두 번 실행해 행 수가 변하지 않는 것을 수동으로 확인한다.

## 검증 명령

```bash
cd clover && .venv/bin/ruff check apps/fridge --no-cache && .venv/bin/ruff format apps/fridge --no-cache
cd clover && MYPYPATH=apps .venv/bin/mypy -p fridge --config-file pyproject.toml --cache-dir=/tmp/mypy_cache_fridge
cd clover && .venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
cd fortune && flutter analyze --fatal-infos && dart format --set-exit-if-changed . && flutter test
```

백엔드 반영은 이미지를 먼저 빌드하고 일회용 컨테이너로 `import main` 을 확인한 뒤 교체한다. `backend` 컨테이너는 `api.cloverky.cloud` 로 나가는 실서비스다.

## 범위 밖

- 로그인·OAuth·내 냉장고 — 토큰 발급 경로를 앱에 만드는 별도 작업이다
- 재료 추가·삭제 — 인증이 선행되어야 한다
- `core/dependencies.py` 가 `Authorization` 헤더를 읽게 하는 변경 — 공용 인증 코드다
- `fridge` 의 `from clover.apps.fridge...` import (`clover/CLAUDE.md` 가 금지한 접두사) — 기존 위반이고 이번 작업과 무관하다
- 웹에 같은 화면을 만드는 일
