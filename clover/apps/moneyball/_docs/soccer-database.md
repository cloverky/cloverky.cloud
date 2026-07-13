요청하신 요구사항을 반영하여, 기존의 명확한 구조와 카파시의 하네스 원칙을 그대로 유지하면서 **Docker Compose 및 Dockerfile 기반의 컨테이너 환경 구축 지시사항을 완벽하게 추가한 한글 최적화 프롬프트**입니다.

마찬가지로 아래 코드 블록을 복사하여 Claude Code 창에 바로 입력하시면 됩니다.

```markdown
# 시스템 프롬프트: Docker 기반 PostgreSQL (pgvector) 스키마 및 Alembic 마이그레이션 생성 지시문

본 프롬프트는 **카파시의 하네스 원칙(Karpathy's Harness Principles)**에 따라 작성되었습니다. 모델에게 모호함 없는 명확한 환경 정보, 제약 조건, 명시적 테이블 스키마 및 컨테이너 라이프사이클을 포함한 정밀한 출력 형식을 제공합니다.

---

## 📋 역할 및 콘텍스트 (Role & Context)
당신은 PostgreSQL, `pgvector`, Docker 컨테이너라이제이션, 그리고 SQLAlchemy/Alembic 마이그레이션에 정통한 수석 데브옵스(DevOps) 겸 데이터 아키텍트입니다.
당신의 임무는 **Docker 컨테이너 환경**에서 작동하는 PostgreSQL(`pgvector` 확장 포함) 인프라를 정의하고, 제공된 축구 데이터 ERD를 기반으로 SQLAlchemy 모델과 Alembic 마이그레이션 자동화 스크립트를 완벽하게 구축하는 것입니다.

---

## 🛠️ 시스템 환경 및 기술 스택 (System Environment & Stack)
- **Host OS:** Ubuntu 24.04 LTS (또는 Docker 환경)
- **Container OS:** `postgres:16-alpine` 또는 `pgvector/pgvector:pg16` 공식 이미지 기반
- **Database:** PostgreSQL 16 + `pgvector` 확장
- **ORM:** SQLAlchemy 2.0+ (Declarative Mapping 방식 사용)
- **Migration Tool:** Alembic 1.11+
- **Vector Library:** `pgvector.sqlalchemy`

---

## 🐳 도커 컨테이너 환경 요구사항 (Dockerization Specification)

모든 데이터베이스 설치와 초기화, 마이그레이션은 Docker 컨테이너 내부에서 실행 가능해야 합니다. 이를 위해 다음 두 가지 파일을 설계해야 합니다.

1. **`Dockerfile` (Application & Migration Runner):**
   - Python 3.11+ 기반 이미지 사용
   - PostgreSQL 연결을 위한 필수 라이브러리 및 패키지 설치
   - 마이그레이션을 자동으로 실행하거나 대기하는 진입점(Entrypoint) 스크립트 포함

2. **`docker-compose.yml` (Multi-Container Architecture):**
   - **`db` 서비스:** `pgvector`가 기본 탑재된 이미지(`pgvector/pgvector:pg16`)를 사용하거나 빌드 레이어 정의. 환경 변수(`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`) 설정 및 볼륨(Volume)을 통한 데이터 영속성 확보.
   - **`migration` 서비스:** `db` 서비스가 완전히 준비(Healthcheck)된 후, Alembic 마이그레이션을 실행하고 종료되는 컨테이너 구조 설계.

---

## 📐 데이터베이스 스키마 사양 (ERD 상세 사양)

다음 4개의 테이블을 제공된 규칙에 맞춰 완전히 생성하세요. 외래키(Foreign Key) 제약 조건, 데이터 타입, 기본키(Primary Key) 구조를 완벽하게 일치시켜야 합니다.

### 1. `stadium` 테이블 (경기장)
- `stadium_id` (VARCHAR(10), Primary Key)
- `statdium_name` (VARCHAR(40), Not Null) *(주의: ERD에 표기된 스펠링 오타 'statdium_name'을 그대로 유지할 것)*
- `hometeam_id` (VARCHAR(10), Nullable)
- `seat_count` (INTEGER, Nullable)
- `address` (VARCHAR(60), Nullable)
- `ddd` (VARCHAR(10), Nullable)
- `tel` (VARCHAR(10), Nullable)

### 2. `team` 테이블 (구단)
- `team_id` (VARCHAR(10), Primary Key)
- `region_name` (VARCHAR(10), Not Null)
- `team_name` (VARCHAR(40), Not Null)
- `e_team_name` (VARCHAR(50), Nullable)
- `orig_yyyy` (VARCHAR(10), Nullable)
- `zip_code1` (VARCHAR(10), Nullable)
- `zip_code2` (VARCHAR(10), Nullable)
- `address` (VARCHAR(80), Nullable)
- `ddd` (VARCHAR(10), Nullable)
- `tel` (VARCHAR(10), Nullable)
- `fax` (VARCHAR(10), Nullable)
- `homepage` (VARCHAR(50), Nullable)
- `owner` (VARCHAR(10), Nullable)
- `stadium_id` (VARCHAR(10), Foreign Key -> `stadium.stadium_id` 참조)

### 3. `schedule` 테이블 (경기 일정)
- `sche_date` (VARCHAR(10), Primary Key)
- `stadium_id` (VARCHAR(10), Primary Key, Foreign Key -> `stadium.stadium_id` 참조)
- `gubun` (VARCHAR(10), Nullable)
- `hometeam_id` (VARCHAR(10), Nullable)
- `awayteam_id` (VARCHAR(10), Nullable)
- `home_score` (INTEGER, Nullable)
- `away_score` (INTEGER, Nullable)

### 4. `player` 테이블 (선수 및 벡터 통합)
- `player_id` (VARCHAR(10), Primary Key)
- `player_name` (VARCHAR(20), Not Null)
- `e_player_name` (VARCHAR(40), Nullable)
- `nickname` (VARCHAR(30), Nullable)
- `join_yyyy` (VARCHAR(10), Nullable)
- `position` (VARCHAR(10), Nullable)
- `back_no` (INTEGER, Nullable)
- `nation` (VARCHAR(20), Nullable)
- `birth_date` (DATE, Nullable)
- `solar` (VARCHAR(10), Nullable)
- `height` (INTEGER, Nullable)
- `weight` (INTEGER, Nullable)
- `team_id` (VARCHAR(10), Foreign Key -> `team.team_id` 참조)

#### 🌟 pgvector 기능 연동 요구사항 (중요)
`pgvector`를 활용하기 위해, 선수의 프로필 기반 임베딩을 저장할 수 있는 벡터 컬럼을 `player` 테이블에 추가하세요.
- `player_embedding` (Vector(1536), Nullable) *— OpenAI text-embedding-3-small 등 표준 임베딩 모델 규격인 1536 차원으로 지정.*

---

## 🎯 구현 및 마이그레이션 지시사항

### 1단계: 컨테이너 기반 pgvector 확장 활성화
Alembic 마이그레이션 파일에서 벡터 타입을 사용하는 테이블을 생성하기 전에, 반드시 PostgreSQL 내부에서 `vector` 확장을 등록 및 생성하는 SQL이 선행되어야 합니다.
```python
op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

```

### 2단계: SQLAlchemy 2.0 모델 정의 (`models.py`)

`Mapped` 및 `mapped_column`을 사용하는 최신 SQLAlchemy 2.0 스타일로 코드를 작성하세요. `from pgvector.sqlalchemy import Vector`를 정확히 임포트하세요.

### 3단계: Alembic 마이그레이션 스크립트 생성 (`xxxx_initial_soccer_schema.py`)

데이터베이스 외래키 의존성 관계에 따른 순서(`stadium` -> `team` -> `player` 및 `schedule`)를 엄격히 준수하여 `upgrade()` 및 `downgrade()` 코드를 구성하세요.

---

## 🛑 하네스 원칙에 따른 제약 조건 (Strict Constraints)

1. **생략 금지:** `# ... 나머지 필드`와 같은 생략용 주석을 사용하지 마세요. 모든 필드와 Docker 설정 파일을 온전하게 코드로 구현해야 합니다.
2. **컨테이너 정렬 및 멱등성:** DB 컨테이너가 완벽히 뜰 때까지 마이그레이션 컨테이너가 대기(`depends_on`의 `condition: service_healthy`)하도록 설계하여 시퀀스 에러를 원천 차단하세요.
3. **정확한 데이터 타입 매핑:** ERD에 정의된 VARCHAR 길이를 엄격히 준수하고, `birth_date` 필드는 실제 `Date` 타입으로 매핑하세요.

---

## 📤 최종 출력 포맷 (Expected Output Format)

답변은 가독성을 위해 다음과 같은 파일 구조로 명확히 분리하여 제공해 주세요.

### 1. Docker 환경 설정 파일 (`docker-compose.yml`, `Dockerfile`)

```yaml
# docker-compose.yml 전체 코드를 여기에 작성하세요.

```


```dockerfile
# Dockerfile 전체 코드를 여기에 작성하세요.

```

### 2. Python 의존성 파일 (`requirements.txt`)

```text
# 패키지 목록과 권장 버전을 명시하세요.

```

### 3. SQLAlchemy 모델 정의 소스 코드 (`models.py`)

```python
# 전체 코드를 여기에 작성하세요.

```

### 4. Alembic 마이그레이션 스크립트 (`xxxx_initial_soccer_schema.py`)

```python
# 마이그레이션 업그레이드/다운그레이드 전체 코드를 여기에 작성하세요.

```

```

```