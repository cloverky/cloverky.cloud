# star_craft 크롤러 · 스크래퍼 파이프라인

> Redis에서 대상을 읽어 웹 페이지를 수집/추출하고 결과를 jsonl로 적재하는 **독립 2개 파이프라인**.
> 헥사고날(Ports & Adapters) 구조를 따른다.

---

## 1. 두 파이프라인 (독립)

| 파이프라인 | 입력 (Redis) | 동작 | 출력 (jsonl) |
|-----------|-------------|------|-------------|
| **크롤러** | 웹사이트 목록 | 각 페이지 전체를 수집해 가시 텍스트 추출 | `fridge/resources/crawled/` |
| **스크래퍼** | 웹사이트 목록 + 키워드 | 페이지에서 **키워드 문맥(snippet)** 만 추출 | `fridge/resources/scraped/` |

두 파이프라인은 서로 import하지 않으며 UseCase·포트·프로바이더가 완전히 분리돼 있다.

---

## 2. Redis 키 스키마 (확정)

> Redis가 비어 있어(기존 스키마 없음) 아래 스키마를 신규 확정했다. env로 오버라이드 가능.

| 키 | 타입 | 용도 | env 오버라이드 |
|----|------|------|----------------|
| `crawler:websites` | LIST | 크롤 대상 URL | `CRAWLER_WEBSITES_KEY` |
| `scraper:websites` | LIST | 스크래핑 대상 URL | `SCRAPER_WEBSITES_KEY` |
| `scraper:keywords` | SET | 스크래핑 키워드 | `SCRAPER_KEYWORDS_KEY` |

- 접속 URL: `REDIS_URL` (기본 `redis://redis:6379/0` — compose 서비스명 `redis`)

### 시드 예시 (redis-cli)

```bash
docker exec cloverkycloud-redis-1 redis-cli RPUSH crawler:websites "https://example.com"
docker exec cloverkycloud-redis-1 redis-cli RPUSH scraper:websites "https://example.com"
docker exec cloverkycloud-redis-1 redis-cli SADD  scraper:keywords "사과" "유통기한"
```

---

## 3. 헥사고날 레이어

```
adapter/inbound/api/v1/crawler_router.py   POST /api/star_craft/crawler/run
adapter/inbound/api/v1/scraper_router.py   POST /api/star_craft/scraper/run
        │
        ▼ Depends(get_*_use_case)
dependencies/crawler_provider.py           조립 (유일한 조립 지점)
dependencies/scraper_provider.py
        │
        ▼
app/use_cases/crawler_interactor.py        오케스트레이션 (포트만 의존)
app/use_cases/scraper_interactor.py
        │
        ├─ app/ports/output/crawl_source_gateway.py   ← adapter/outbound/redis/crawl_source_gateway.py
        ├─ app/ports/output/scrape_source_gateway.py  ← adapter/outbound/redis/scrape_source_gateway.py
        ├─ app/ports/output/page_fetch_gateway.py     ← adapter/outbound/httpx/page_fetch_gateway.py (공용)
        └─ app/ports/output/jsonl_sink_gateway.py     ← adapter/outbound/filesystem/jsonl_sink_gateway.py (공용)

domain/value_objects/html_text.py          순수 함수: extract_text, find_snippets (stdlib html.parser)
app/constants/paths.py                     CRAWLED_DIR / SCRAPED_DIR (fridge/resources 경로)
```

- 페이지 수집(`PageFetchPort`)과 파일 적재(`JsonlSinkPort`)는 두 파이프라인이 공유하는 최소 포트다.
- 텍스트 추출·키워드 문맥 추출은 외부 의존성 없이 **stdlib `html.parser`** 만 사용 (bs4 미도입).

---

## 4. 출력 포맷 (jsonl)

파일명: `{crawled|scraped}_{YYYYMMDDThhmmssZ}.jsonl` (실행마다 새 파일)

**crawled** 한 줄:
```json
{"url": "...", "status_code": 200, "ok": true, "content_length": 1234, "text": "...", "fetched_at": "...", "error": null}
```

**scraped** 한 줄 (키워드 매칭당 1줄):
```json
{"url": "...", "keyword": "사과", "snippet": "...앞뒤 문맥...", "fetched_at": "..."}
```

---

## 5. 실행

```bash
# Redis 시드 (§2) 후
curl -X POST http://localhost:8000/api/star_craft/crawler/run
curl -X POST http://localhost:8000/api/star_craft/scraper/run
```

의존성: `redis>=5.0.0` (requirements.txt / requirements-docker.txt). 코드 변경 후 `docker compose build backend && docker compose up -d backend`.
