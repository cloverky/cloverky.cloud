from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScrapedRecord:
    """키워드에 매칭된 스크래핑 결과 한 건 (jsonl 한 줄로 적재)."""

    url: str
    keyword: str
    snippet: str
    fetched_at: str


@dataclass(frozen=True)
class ScrapeResultDto:
    """스크래핑 파이프라인 실행 요약."""

    pages: int
    matches: int
    output_path: str
