from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CrawledPage:
    """크롤러가 수집한 페이지 한 건 (jsonl 한 줄로 적재)."""

    url: str
    status_code: int
    ok: bool
    content_length: int
    text: str
    fetched_at: str
    error: str | None = None


@dataclass(frozen=True)
class CrawlResultDto:
    """크롤 파이프라인 실행 요약."""

    total: int
    succeeded: int
    failed: int
    output_path: str
