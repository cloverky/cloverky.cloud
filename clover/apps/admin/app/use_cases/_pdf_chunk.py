"""PDF 요약 보조 순수 함수 — 외부 의존 없음."""

from __future__ import annotations


def split_text(text: str, size: int) -> list[str]:
    """LLM 컨텍스트에 맞게 텍스트를 size 단위로 자른다.

    가능하면 줄바꿈 경계에서 끊어 문장이 잘리는 것을 줄인다.
    """
    if size <= 0:
        raise ValueError("size는 1 이상이어야 한다")

    chunks: list[str] = []
    remaining = text.strip()
    while len(remaining) > size:
        window = remaining[:size]
        cut = window.rfind("\n")
        if cut < size // 2:
            cut = size
        chunks.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()
    if remaining:
        chunks.append(remaining)
    return chunks


def preview_of(text: str, length: int = 300) -> str:
    """응답에 실을 원문 미리보기."""
    flat = " ".join(text.split())
    return flat if len(flat) <= length else flat[:length] + "…"
