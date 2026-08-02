# 식재료 둘러보기 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩의 `시작하기` 를 누르면 실제 DB 의 식재료 목록을 보여주는 화면으로 이동한다.

**Architecture:** `fridge` 의 `category`·`foods` 슬라이스는 파일만 있고 내용이 스텁이다. 리포지토리가 실제 SELECT 를 하도록 채우고, 라우터가 목록을 반환하게 바꾼다. 앱은 그 두 엔드포인트를 읽는 화면 하나를 더한다. 인증은 필요 없다.

**Tech Stack:** FastAPI · SQLAlchemy 2.x async / Flutter (`http`)

**설계 문서:** `_docs/catalog-browse-design.md`

## Global Constraints

- 브랜치는 `main`. 원격과 동기화된 상태에서 시작한다.
- 백엔드 명령은 `clover/` 에서, 앱 명령은 `fortune/` 에서 실행한다.
- 검사 도구는 `clover/.venv` 에 있다. 캐시 디렉터리가 root 소유라 `ruff --no-cache`, `mypy --cache-dir=/tmp/...` 로 우회한다.
- mypy 는 `MYPYPATH=apps` 와 `-p fridge` 가 함께 필요하다.
- **ORM 은 반드시 `fridge.adapter.outbound.orm...` 경로로 임포트한다.** `main.py` 가 그 경로로 임포트하므로, 같은 모듈을 `clover.apps.fridge...` 로 한 번 더 임포트하면 SQLAlchemy 가 `categories` 테이블을 두 번 등록하며 죽는다.
- ORM 외의 임포트는 **해당 파일의 기존 스타일을 따른다** (이 슬라이스는 `clover.apps.fridge...` 를 쓴다). `clover/CLAUDE.md` 는 이 접두사를 금지하지만 이미 전 파일이 그렇게 돼 있어, 이번 작업에서 일괄 변경하지 않는다.
- 응답에 인증을 붙이지 않는다. 카탈로그는 사용자별 데이터가 아니다.
- 빈 목록은 오류가 아니라 `[]` 다.
- 비밀값을 코드·문서·커밋에 넣지 않는다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `clover/scripts/seed_fridge_catalog.py` (신규) | 카테고리·식품 기초 데이터를 멱등하게 넣는다 |
| `clover/apps/fridge/app/dtos/category_dto.py` | `CategoryItem` 추가 |
| `clover/apps/fridge/app/dtos/foods_dto.py` | `FoodItem` 추가 |
| `.../app/ports/input/category_use_case.py` | `list_categories()` |
| `.../app/ports/input/foods_use_case.py` | `list_foods(category_id)` |
| `.../app/ports/output/category_repository.py` | `list_categories()` |
| `.../app/ports/output/foods_repository.py` | `list_foods(category_id)` |
| `.../app/use_cases/category_interactor.py` | 위임 |
| `.../app/use_cases/foods_interactor.py` | 위임 |
| `.../adapter/outbound/repositories/category_pg_repository.py` | 실제 SELECT |
| `.../adapter/outbound/repositories/foods_pg_repository.py` | 실제 SELECT |
| `.../adapter/inbound/api/v1/category_router.py` | 목록 반환 |
| `.../adapter/inbound/api/v1/foods_router.py` | 목록 반환 + `category_id` 필터 |
| `clover/apps/fridge/tests/conftest.py` (신규) | `sys.path` 설정 |
| `clover/apps/fridge/tests/app/use_cases/test_catalog_interactors.py` (신규) | 인터랙터 |
| `clover/apps/fridge/tests/adapter/test_catalog_routers.py` (신규) | 라우터 |
| `fortune/lib/catalog/catalog_api.dart` (신규) | 포트 + HTTP 구현, 모델 |
| `fortune/lib/catalog/catalog_screen.dart` (신규) | 화면 |
| `fortune/lib/landing_screen.dart` | `시작하기` 연결, `문서 보기` 삭제 |
| `fortune/test/catalog_screen_test.dart` (신규) | 위젯 3상태 |

---

## Task 1: 시드 데이터

**Files:**
- Create: `clover/scripts/seed_fridge_catalog.py`

**Interfaces:**
- Consumes: 없음
- Produces: `categories` 8행, `foods` 34행

- [ ] **Step 1: 스크립트 작성**

`clover/scripts/seed_fridge_catalog.py`:

```python
"""fridge 카탈로그 기초 데이터. 여러 번 실행해도 결과가 같다.

실행:
    cd clover && docker compose run --rm --no-deps backend \
        sh -c 'cd /project/clover && PYTHONPATH=/project/clover/apps:/project/clover:/project \
               python scripts/seed_fridge_catalog.py'
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from fridge.adapter.outbound.orm.category_orm import CategoryOrm
from fridge.adapter.outbound.orm.foods_orm import FoodsOrm
from fridge.models.database import engine
from sqlalchemy.ext.asyncio import AsyncSession

CATALOG: dict[str, list[tuple[str, str]]] = {
    "채소": [("양파", "개"), ("대파", "단"), ("당근", "개"), ("감자", "개"), ("배추", "포기")],
    "과일": [("사과", "개"), ("바나나", "개"), ("딸기", "팩"), ("귤", "개")],
    "육류": [("삼겹살", "g"), ("닭가슴살", "g"), ("소고기 등심", "g"), ("다짐육", "g")],
    "수산물": [("고등어", "마리"), ("새우", "g"), ("오징어", "마리"), ("연어", "g")],
    "유제품": [("우유", "mL"), ("치즈", "장"), ("요거트", "개"), ("버터", "g")],
    "곡물": [("쌀", "kg"), ("밀가루", "g"), ("국수", "g"), ("식빵", "봉")],
    "조미료": [("간장", "mL"), ("고추장", "g"), ("소금", "g"), ("설탕", "g"), ("참기름", "mL")],
    "음료": [("생수", "mL"), ("오렌지주스", "mL"), ("탄산수", "mL"), ("커피", "mL")],
}


async def seed(session: AsyncSession) -> None:
    for order, (category_name, foods) in enumerate(CATALOG.items(), start=1):
        category = (
            await session.execute(
                select(CategoryOrm).where(CategoryOrm.name == category_name)
            )
        ).scalar_one_or_none()

        if category is None:
            category = CategoryOrm(name=category_name, sort_order=order)
            session.add(category)
            await session.flush()  # id 를 얻기 위해

        for food_name, unit in foods:
            exists = (
                await session.execute(
                    select(FoodsOrm.id).where(
                        FoodsOrm.category_id == category.id,
                        FoodsOrm.name == food_name,
                    )
                )
            ).first()
            if exists is None:
                session.add(
                    FoodsOrm(
                        category_id=category.id,
                        name=food_name,
                        default_unit=unit,
                    )
                )

    await session.commit()


async def main() -> None:
    async with AsyncSession(engine) as session:
        await seed(session)
        categories = (await session.execute(select(CategoryOrm))).scalars().all()
        foods = (await session.execute(select(FoodsOrm))).scalars().all()
        print(f"categories: {len(categories)}")
        print(f"foods:      {len(foods)}")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: 실행**

```bash
cd ~/projects/cloverky.cloud/clover
docker compose run --rm --no-deps backend sh -c 'cd /project/clover && PYTHONPATH=/project/clover/apps:/project/clover:/project python scripts/seed_fridge_catalog.py'
```

기대: `categories: 8`, `foods: 34`

컨테이너 이미지에는 아직 이 스크립트가 없다. 먼저 `docker compose build backend` 로 이미지를 새로 만든 뒤 실행한다.

- [ ] **Step 3: 멱등성 확인 — 한 번 더 실행**

같은 명령을 다시 실행한다.

기대: 여전히 `categories: 8`, `foods: 34`. 숫자가 늘면 존재 확인 조건이 틀린 것이다.

- [ ] **Step 4: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/scripts/seed_fridge_catalog.py
git commit -m "chore(fridge): seed the category and food catalog"
```

---

## Task 2: 카테고리 목록 API

**Files:**
- Modify: `clover/apps/fridge/app/dtos/category_dto.py`
- Modify: `clover/apps/fridge/app/ports/input/category_use_case.py`
- Modify: `clover/apps/fridge/app/ports/output/category_repository.py`
- Modify: `clover/apps/fridge/app/use_cases/category_interactor.py`
- Modify: `clover/apps/fridge/adapter/outbound/repositories/category_pg_repository.py`
- Modify: `clover/apps/fridge/adapter/inbound/api/v1/category_router.py`
- Create: `clover/apps/fridge/tests/conftest.py`
- Create: `clover/apps/fridge/tests/app/use_cases/test_catalog_interactors.py`

**Interfaces:**
- Consumes: Task 1 의 데이터
- Produces:
  - `CategoryItem(id: int, name: str, sort_order: int | None)`
  - `CategoryUseCase.list_categories() -> list[CategoryItem]`
  - `CategoryRepository.list_categories() -> list[CategoryItem]`
  - `GET /api/fridge/category/list` → `[{"id","name","sort_order"}]`

- [ ] **Step 1: conftest 작성**

`clover/apps/fridge/tests/conftest.py` — weather 슬라이스와 같은 방식이다.

```python
import sys
from pathlib import Path

_here = Path(__file__).parent

_apps_dir = str(_here.parent.parent)
if _apps_dir not in sys.path:
    sys.path.insert(0, _apps_dir)

_backend_dir = str(_here.parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

_root_dir = str(_here.parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)
```

- [ ] **Step 2: 실패하는 테스트 작성**

`clover/apps/fridge/tests/app/use_cases/test_catalog_interactors.py`:

```python
"""완료 기준: 인터랙터가 리포지토리 결과를 그대로 전달하는지 — DB 없이."""

from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository
from clover.apps.fridge.app.use_cases.category_interactor import CategoryInteractor

CATEGORIES = [
    CategoryItem(id=1, name="채소", sort_order=1),
    CategoryItem(id=2, name="과일", sort_order=2),
]


class FakeCategoryRepository(CategoryRepository):
    def __init__(self) -> None:
        self.calls = 0

    async def list_categories(self) -> list[CategoryItem]:
        self.calls += 1
        return CATEGORIES


async def test_category_list_is_passed_through() -> None:
    """리포지토리 결과를 그대로 돌려준다."""
    repository = FakeCategoryRepository()

    result = await CategoryInteractor(repository=repository).list_categories()

    assert repository.calls == 1
    assert [c.name for c in result] == ["채소", "과일"]


async def test_empty_category_list_is_not_an_error() -> None:
    """비어 있어도 빈 목록을 그대로 돌려준다."""

    class Empty(CategoryRepository):
        async def list_categories(self) -> list[CategoryItem]:
            return []

    assert await CategoryInteractor(repository=Empty()).list_categories() == []
```

`pytest.ini` 의 `asyncio_mode = auto` 덕분에 `@pytest.mark.asyncio` 를 붙이지 않는다.

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: FAIL — `CategoryItem` 을 찾을 수 없다.

- [ ] **Step 4: DTO 추가**

`app/dtos/category_dto.py` 의 기존 내용을 두고 아래를 더한다.

```python
@dataclass(frozen=True)
class CategoryItem:
    id: int
    name: str
    sort_order: int | None
```

파일 첫 줄에 `from __future__ import annotations` 가 없으면 추가한다 (`int | None` 표기에 필요).

- [ ] **Step 5: 포트 교체**

`app/ports/input/category_use_case.py` 를 아래로 바꾼다. 단건 `get_list` 는 소비자가 없으므로 남기지 않는다.

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.category_dto import CategoryItem


class CategoryUseCase(ABC):
    @abstractmethod
    async def list_categories(self) -> list[CategoryItem]:
        pass
```

`app/ports/output/category_repository.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.category_dto import CategoryItem


class CategoryRepository(ABC):
    @abstractmethod
    async def list_categories(self) -> list[CategoryItem]:
        pass
```

- [ ] **Step 6: 인터랙터 교체**

`app/use_cases/category_interactor.py`:

```python
from __future__ import annotations

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.input.category_use_case import CategoryUseCase
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository


class CategoryInteractor(CategoryUseCase):
    def __init__(self, repository: CategoryRepository) -> None:
        self.repository = repository

    async def list_categories(self) -> list[CategoryItem]:
        return await self.repository.list_categories()
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: PASS — 2개.

- [ ] **Step 8: 리포지토리에 실제 조회 구현**

`adapter/outbound/repositories/category_pg_repository.py`:

```python
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.output.category_repository import CategoryRepository
from fridge.adapter.outbound.orm.category_orm import CategoryOrm

logger = logging.getLogger(__name__)


class CategoryPgRepository(CategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(self) -> list[CategoryItem]:
        rows = (
            (
                await self.session.execute(
                    select(CategoryOrm).order_by(
                        CategoryOrm.sort_order, CategoryOrm.id
                    )
                )
            )
            .scalars()
            .all()
        )
        logger.info("[CategoryPgRepository] list_categories | count=%d", len(rows))
        return [
            CategoryItem(id=row.id, name=row.name, sort_order=row.sort_order)
            for row in rows
        ]
```

ORM 임포트 경로에 주의한다. `fridge.adapter...` 여야 한다 (§Global Constraints).

- [ ] **Step 9: 라우터 교체**

`adapter/inbound/api/v1/category_router.py` 에서 파일 상단 docstring 은 그대로 두고 핸들러를 바꾼다.

```python
from fastapi import APIRouter, Depends

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.ports.input.category_use_case import CategoryUseCase
from clover.apps.fridge.dependencies.category_provider import get_category_use_case

category_router = APIRouter(prefix="/category", tags=["category"])


@category_router.get("/list")
async def get_list(
    category: CategoryUseCase = Depends(get_category_use_case),
) -> list[CategoryItem]:
    return await category.list_categories()
```

`CategorySchema` 임포트는 더 이상 쓰지 않으므로 지운다.

- [ ] **Step 10: 하네스**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/ruff check apps/fridge --fix --no-cache
.venv/bin/ruff format apps/fridge --no-cache
MYPYPATH=apps .venv/bin/mypy -p fridge --config-file pyproject.toml --cache-dir=/tmp/mypy_cache_fridge
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: 전부 통과.

- [ ] **Step 11: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/apps/fridge
git commit -m "feat(fridge): return the real category list"
```

---

## Task 3: 식품 목록 API

**Files:**
- Modify: `clover/apps/fridge/app/dtos/foods_dto.py`
- Modify: `clover/apps/fridge/app/ports/input/foods_use_case.py`
- Modify: `clover/apps/fridge/app/ports/output/foods_repository.py`
- Modify: `clover/apps/fridge/app/use_cases/foods_interactor.py`
- Modify: `clover/apps/fridge/adapter/outbound/repositories/foods_pg_repository.py`
- Modify: `clover/apps/fridge/adapter/inbound/api/v1/foods_router.py`
- Modify: `clover/apps/fridge/tests/app/use_cases/test_catalog_interactors.py`
- Create: `clover/apps/fridge/tests/adapter/__init__.py`, `tests/adapter/test_catalog_routers.py`

**Interfaces:**
- Consumes: Task 2 의 `CategoryItem`, conftest
- Produces:
  - `FoodItem(id: int, name: str, category_id: int | None, default_unit: str | None)`
  - `FoodsUseCase.list_foods(category_id: int | None) -> list[FoodItem]`
  - `FoodsRepository.list_foods(category_id: int | None) -> list[FoodItem]`
  - `GET /api/fridge/food/catalog[?category_id=]` → `[{"id","name","category_id","default_unit"}]`

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/app/use_cases/test_catalog_interactors.py` 끝에 더한다.

```python
from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository
from clover.apps.fridge.app.use_cases.foods_interactor import FoodsInteractor

FOODS = [
    FoodItem(id=1, name="양파", category_id=1, default_unit="개"),
    FoodItem(id=2, name="사과", category_id=2, default_unit="개"),
]


class FakeFoodsRepository(FoodsRepository):
    def __init__(self) -> None:
        self.seen: int | None | str = "unset"

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        self.seen = category_id
        return FOODS


async def test_food_list_passes_the_category_filter() -> None:
    """category_id 가 리포지토리까지 그대로 전달된다."""
    repository = FakeFoodsRepository()

    await FoodsInteractor(repository=repository).list_foods(category_id=2)

    assert repository.seen == 2


async def test_food_list_without_a_filter_passes_none() -> None:
    """필터가 없으면 None 이 전달된다 — 전체 조회다."""
    repository = FakeFoodsRepository()

    result = await FoodsInteractor(repository=repository).list_foods(category_id=None)

    assert repository.seen is None
    assert [f.name for f in result] == ["양파", "사과"]
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: FAIL — `FoodItem` 을 찾을 수 없다.

- [ ] **Step 3: DTO 추가**

`app/dtos/foods_dto.py` 의 기존 내용을 두고 더한다. 파일에 `from __future__ import annotations` 가 없으면 첫 줄에 추가한다.

```python
@dataclass(frozen=True)
class FoodItem:
    id: int
    name: str
    category_id: int | None
    default_unit: str | None
```

- [ ] **Step 4: 포트 교체**

`app/ports/input/foods_use_case.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.foods_dto import FoodItem


class FoodsUseCase(ABC):
    @abstractmethod
    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        pass
```

`app/ports/output/foods_repository.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.foods_dto import FoodItem


class FoodsRepository(ABC):
    @abstractmethod
    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        pass
```

- [ ] **Step 5: 인터랙터 교체**

`app/use_cases/foods_interactor.py`:

```python
from __future__ import annotations

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository


class FoodsInteractor(FoodsUseCase):
    def __init__(self, repository: FoodsRepository) -> None:
        self.repository = repository

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        return await self.repository.list_foods(category_id)
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: PASS — 4개.

- [ ] **Step 7: 리포지토리 구현**

`adapter/outbound/repositories/foods_pg_repository.py`:

```python
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.output.foods_repository import FoodsRepository
from fridge.adapter.outbound.orm.foods_orm import FoodsOrm

logger = logging.getLogger(__name__)


class FoodsPgRepository(FoodsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        # 이름이 비어 있는 행은 화면에 빈 줄로 보이므로 제외한다.
        statement = select(FoodsOrm).where(FoodsOrm.name.is_not(None))
        if category_id is not None:
            statement = statement.where(FoodsOrm.category_id == category_id)

        rows = (
            (await self.session.execute(statement.order_by(FoodsOrm.name)))
            .scalars()
            .all()
        )
        logger.info("[FoodsPgRepository] list_foods | count=%d", len(rows))
        return [
            FoodItem(
                id=row.id,
                name=row.name or "",
                category_id=row.category_id,
                default_unit=row.default_unit,
            )
            for row in rows
        ]
```

- [ ] **Step 8: 라우터 교체**

`adapter/inbound/api/v1/foods_router.py` 에서 파일 상단 docstring 이 있으면 그대로 두고 핸들러를 바꾼다.

```python
from fastapi import APIRouter, Depends, Query

from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.dependencies.foods_provider import get_foods_use_case

foods_router = APIRouter(prefix="/food", tags=["food"])


@foods_router.get("/catalog")
async def get_catalog(
    category_id: int | None = Query(None, description="카테고리로 거르기"),
    food: FoodsUseCase = Depends(get_foods_use_case),
) -> list[FoodItem]:
    return await food.list_foods(category_id)
```

`FoodCatalogSchema` 임포트는 더 이상 쓰지 않으므로 지운다.

- [ ] **Step 9: 테스트용 venv 에 sqlalchemy 추가**

라우터 테스트는 라우터 → `dependencies` → `PgRepository` 순으로 임포트가 이어져 SQLAlchemy 를 끌어온다. 인터랙터 테스트와 달리 이건 피할 수 없다 — `dependency_overrides` 의 키로 쓰려면 provider 함수를 임포트해야 하기 때문이다.

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/python -m pip install --quiet "sqlalchemy[asyncio]==2.0.49" greenlet
```

`get_db` 를 임포트하는 것만으로 DB 에 접속하지는 않는다. 접속이 필요해지면 그때 실패하는데, 테스트는 provider 를 override 하므로 그 지점에 닿지 않는다.

- [ ] **Step 10: 라우터 테스트 작성**

`clover/apps/fridge/tests/adapter/__init__.py` 를 빈 파일로 만들고, `tests/adapter/test_catalog_routers.py`:

```python
"""완료 기준: 라우터가 목록을 돌려주고 category_id 를 유스케이스에 넘기는지."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from clover.apps.fridge.app.dtos.category_dto import CategoryItem
from clover.apps.fridge.app.dtos.foods_dto import FoodItem
from clover.apps.fridge.app.ports.input.category_use_case import CategoryUseCase
from clover.apps.fridge.app.ports.input.foods_use_case import FoodsUseCase
from clover.apps.fridge.dependencies.category_provider import get_category_use_case
from clover.apps.fridge.dependencies.foods_provider import get_foods_use_case
from fridge.adapter.inbound.api.v1.category_router import category_router
from fridge.adapter.inbound.api.v1.foods_router import foods_router


class StubCategories(CategoryUseCase):
    async def list_categories(self) -> list[CategoryItem]:
        return [CategoryItem(id=1, name="채소", sort_order=1)]


class SpyFoods(FoodsUseCase):
    def __init__(self) -> None:
        self.seen: int | None | str = "unset"

    async def list_foods(self, category_id: int | None) -> list[FoodItem]:
        self.seen = category_id
        return [FoodItem(id=1, name="양파", category_id=1, default_unit="개")]


def build_client(foods: FoodsUseCase) -> TestClient:
    app = FastAPI()
    app.include_router(category_router)
    app.include_router(foods_router)
    app.dependency_overrides[get_category_use_case] = lambda: StubCategories()
    app.dependency_overrides[get_foods_use_case] = lambda: foods
    return TestClient(app)


def test_category_list_returns_an_array() -> None:
    response = build_client(SpyFoods()).get("/category/list")

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "채소", "sort_order": 1}]


def test_food_catalog_passes_the_category_filter() -> None:
    spy = SpyFoods()
    response = build_client(spy).get("/food/catalog", params={"category_id": 3})

    assert response.status_code == 200
    assert spy.seen == 3


def test_food_catalog_without_a_filter() -> None:
    spy = SpyFoods()
    response = build_client(spy).get("/food/catalog")

    assert response.status_code == 200
    assert spy.seen is None
```

라우터는 `main.py` 와 같은 `fridge.adapter...` 경로로 임포트한다. 라우터가 끌어오는 리포지토리가 ORM 을 `fridge.` 로 임포트하므로, 경로를 섞으면 ORM 모듈이 두 이름으로 로드돼 테이블이 중복 등록된다.

- [ ] **Step 11: 하네스**

```bash
cd ~/projects/cloverky.cloud/clover
.venv/bin/ruff check apps/fridge --fix --no-cache
.venv/bin/ruff format apps/fridge --no-cache
MYPYPATH=apps .venv/bin/mypy -p fridge --config-file pyproject.toml --cache-dir=/tmp/mypy_cache_fridge
.venv/bin/pytest apps/fridge/tests -q -p no:cacheprovider
```

기대: 테스트 7개 통과.

- [ ] **Step 12: 실제 서버에 반영하고 확인**

```bash
cd ~/projects/cloverky.cloud/clover
docker compose build backend
docker compose run --rm --no-deps backend sh -c 'cd /project/clover && PYTHONPATH=/project/clover/apps:/project/clover:/project python -c "import main; print(\"IMPORT_OK\")"'
```

`IMPORT_OK` 가 나오면 교체한다. `backend` 는 `api.cloverky.cloud` 로 나가는 실서비스다.

```bash
docker compose up -d backend
sleep 15
curl -s "http://localhost:8000/api/fridge/category/list" | head -c 300
curl -s "http://localhost:8000/api/fridge/food/catalog?category_id=1" | head -c 300
```

기대: 카테고리 8개 배열, 채소 카테고리의 식품 5개 배열.

- [ ] **Step 13: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add clover/apps/fridge
git commit -m "feat(fridge): return the real food catalog with a category filter"
```

---

## Task 4: 앱 화면

**Files:**
- Create: `fortune/lib/catalog/catalog_api.dart`
- Create: `fortune/lib/catalog/catalog_screen.dart`
- Create: `fortune/test/catalog_screen_test.dart`
- Modify: `fortune/lib/landing_screen.dart`

**Interfaces:**
- Consumes: Task 2·3 의 두 엔드포인트
- Produces: `CatalogScreen`

- [ ] **Step 1: 실패하는 테스트 작성**

`fortune/test/catalog_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/catalog/catalog_api.dart';
import 'package:fortune/catalog/catalog_screen.dart';

class FakeCatalogApi implements CatalogApi {
  FakeCatalogApi({this.fail = false});

  final bool fail;
  int? askedCategoryId;

  @override
  Future<List<Category>> categories() async {
    if (fail) throw Exception('boom');
    return const [
      Category(id: 1, name: '채소'),
      Category(id: 2, name: '과일'),
    ];
  }

  @override
  Future<List<Food>> foods({int? categoryId}) async {
    if (fail) throw Exception('boom');
    askedCategoryId = categoryId;
    return categoryId == 2
        ? const [Food(id: 9, name: '사과', unit: '개')]
        : const [Food(id: 1, name: '양파', unit: '개')];
  }
}

Future<void> _pump(WidgetTester tester, CatalogApi api) async {
  await tester.pumpWidget(MaterialApp(home: CatalogScreen(api: api)));
}

void main() {
  testWidgets('불러오면 식재료를 보여준다', (tester) async {
    await _pump(tester, FakeCatalogApi());
    await tester.pumpAndSettle();

    expect(find.textContaining('양파'), findsOneWidget);
  });

  testWidgets('카테고리를 고르면 그 카테고리만 조회한다', (tester) async {
    final api = FakeCatalogApi();
    await _pump(tester, api);
    await tester.pumpAndSettle();

    await tester.tap(find.text('과일'));
    await tester.pumpAndSettle();

    expect(api.askedCategoryId, 2);
    expect(find.textContaining('사과'), findsOneWidget);
  });

  testWidgets('실패하면 안내를 보여주고 화면이 죽지 않는다', (tester) async {
    await _pump(tester, FakeCatalogApi(fail: true));
    await tester.pumpAndSettle();

    expect(find.textContaining('불러오지 못했'), findsOneWidget);
  });
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter test test/catalog_screen_test.dart
```

기대: FAIL — `package:fortune/catalog/...` 를 찾을 수 없다.

- [ ] **Step 3: API 포트와 구현 작성**

`fortune/lib/catalog/catalog_api.dart`:

```dart
import 'dart:convert';

import 'package:http/http.dart' as http;

class Category {
  const Category({required this.id, required this.name});

  final int id;
  final String name;
}

class Food {
  const Food({required this.id, required this.name, this.unit});

  final int id;
  final String name;
  final String? unit;
}

abstract class CatalogApi {
  Future<List<Category>> categories();
  Future<List<Food>> foods({int? categoryId});
}

class HttpCatalogApi implements CatalogApi {
  HttpCatalogApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cloverky.cloud',
  );

  Future<List<dynamic>> _getList(Uri uri) async {
    final response = await _client.get(uri);
    return jsonDecode(response.body) as List<dynamic>;
  }

  @override
  Future<List<Category>> categories() async {
    final rows = await _getList(Uri.parse('$_baseUrl/api/fridge/category/list'));
    return rows
        .map((row) => Category(
              id: (row as Map<String, dynamic>)['id'] as int,
              name: row['name'] as String,
            ))
        .toList();
  }

  @override
  Future<List<Food>> foods({int? categoryId}) async {
    final uri = Uri.parse('$_baseUrl/api/fridge/food/catalog').replace(
      queryParameters:
          categoryId == null ? null : {'category_id': '$categoryId'},
    );
    final rows = await _getList(uri);
    return rows
        .map((row) => Food(
              id: (row as Map<String, dynamic>)['id'] as int,
              name: row['name'] as String,
              unit: row['default_unit'] as String?,
            ))
        .toList();
  }
}
```

- [ ] **Step 4: 화면 작성**

`fortune/lib/catalog/catalog_screen.dart`:

```dart
import 'package:flutter/material.dart';

import '../theme.dart';
import 'catalog_api.dart';

/// 인증 없이 볼 수 있는 식재료 카탈로그. 상태는 로딩·결과·실패 셋뿐이다.
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, required this.api});

  final CatalogApi api;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  List<Category> _categories = const [];
  List<Food> _foods = const [];
  int? _selectedCategoryId;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final categories = await widget.api.categories();
      final foods = await widget.api.foods(categoryId: _selectedCategoryId);
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _foods = foods;
        _loading = false;
      });
    } catch (error) {
      debugPrint('Catalog load failed: $error');
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  Future<void> _select(int? categoryId) async {
    setState(() => _selectedCategoryId = categoryId);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        title: const Text('식재료 둘러보기', style: TextStyle(color: kFg)),
        iconTheme: const IconThemeData(color: kFg),
      ),
      body: _failed ? _buildFailed() : _buildBody(),
    );
  }

  Widget _buildFailed() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('식재료를 불러오지 못했어요', style: TextStyle(color: kFg)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('다시 시도')),
          ],
        ),
      );

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 56,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _chip(label: '전체', id: null),
              for (final category in _categories)
                _chip(label: category.name, id: category.id),
            ],
          ),
        ),
        Expanded(
          child: _foods.isEmpty
              ? const Center(
                  child: Text('아직 등록된 식재료가 없어요',
                      style: TextStyle(color: kMutedFg)),
                )
              : ListView.separated(
                  itemCount: _foods.length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, color: kBorder),
                  itemBuilder: (_, index) {
                    final food = _foods[index];
                    return ListTile(
                      title: Text(
                        food.unit == null
                            ? food.name
                            : '${food.name} · ${food.unit}',
                        style: const TextStyle(color: kFg),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _chip({required String label, required int? id}) {
    final selected = _selectedCategoryId == id;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => _select(id),
        selectedColor: kAccent.withValues(alpha: 0.18),
        backgroundColor: Colors.white,
        side: const BorderSide(color: kBorder),
      ),
    );
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter test test/catalog_screen_test.dart
```

기대: PASS — 3개.

- [ ] **Step 6: 랜딩에서 연결하고 `문서 보기` 삭제**

`fortune/lib/landing_screen.dart` 의 `_CtaRow` 에서 `OutlinedButton`(문서 보기) 전체를 지우고, `ElevatedButton`(시작하기) 의 `onPressed` 를 아래로 바꾼다.

```dart
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => CatalogScreen(api: HttpCatalogApi()),
            ),
          ),
```

`_CtaRow` 는 지금 `StatelessWidget` 이고 `build` 안에서 `context` 를 쓸 수 있으므로 구조 변경은 필요 없다.

파일 상단에 import 를 더한다.

```dart
import 'catalog/catalog_api.dart';
import 'catalog/catalog_screen.dart';
```

`Wrap` 의 자식이 하나만 남으므로 `Wrap` 을 그대로 둬도 무방하다. 레이아웃을 바꾸지 않는다.

- [ ] **Step 7: 하네스와 전체 테스트**

```bash
cd ~/projects/cloverky.cloud/fortune
dart format lib test
flutter analyze --fatal-infos
dart format --set-exit-if-changed .
flutter test
```

기대: analyze 이슈 0건, 테스트 전부 통과.

- [ ] **Step 8: 에뮬레이터에서 확인**

```bash
cd ~/projects/cloverky.cloud/fortune
flutter build apk --debug
adb install -r build/app/outputs/flutter-apk/app-debug.apk
adb shell am force-stop com.example.fortune
adb shell monkey -p com.example.fortune -c android.intent.category.LAUNCHER 1
```

에뮬레이터는 `fortune_api34` 를 쓴다.

기대: 인트로 → 랜딩 → `시작하기` 를 누르면 식재료 목록이 뜨고, `문서 보기` 버튼은 사라져 있다. 카테고리 칩을 누르면 목록이 바뀐다.

- [ ] **Step 9: 커밋**

```bash
cd ~/projects/cloverky.cloud
git add fortune/lib/catalog fortune/test/catalog_screen_test.dart fortune/lib/landing_screen.dart
git commit -m "feat(app): browse the food catalog from the landing screen"
```

---

## 완료 기준

- `시작하기` 를 누르면 실제 DB 의 식재료 목록이 보인다. 카테고리 칩으로 걸러진다.
- `문서 보기` 버튼이 사라졌다.
- `GET /api/fridge/category/list` 가 8개, `/food/catalog` 가 36개를 돌려준다.
- `ruff` · `mypy` · `pytest apps/fridge/tests` 7개 통과.
- `flutter analyze --fatal-infos` 0건, `flutter test` 전부 통과.
- 시드 스크립트를 두 번 실행해도 행 수가 변하지 않는다.
