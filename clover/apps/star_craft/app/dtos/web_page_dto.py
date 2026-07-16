from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FetchedPage:
    """PageFetchPort가 URL 한 건을 가져온 결과 (크롤러·스크래퍼 공용)."""

    url: str
    status_code: int
    html: str
    ok: bool
    error: str | None = None
