## Backend — DB 모듈 위치 (옮기지 말 것)

1. **`backend/apps/database.py`** — SQLAlchemy `Base`, 비동기 엔진, `get_db`, `dispose_engine` 등 **실제 구현**이 있는 파일. 이 경로를 다른 폴더로 옮기지 말 것.

2. **`backend/apps/fridge/models/database.py`** — 위 구현을 그대로 노출하는 **얇은 호환 레이어** (`from database import …`). Fridge·Alembic 등이 쓰는 `from fridge.models.database import Base` 경로를 유지한다. 이 파일도 다른 디렉터리로 옮기지 말 것.

3. **Neon 도메인 테이블명** — `categories`, `foods`, `codes`, `inventory` (접두사 `fridge_` 없음). 회원은 **`users`만** 사용 (`fridge_users` 없음, `default_storage`는 `users` 컬럼). `alembic_version`은 Alembic 전용이며 앱 `create_all` 대상이 아님.
