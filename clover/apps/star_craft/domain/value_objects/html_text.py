from __future__ import annotations

import contextlib
import re
from html.parser import HTMLParser

# 텍스트로 취급하지 않을 태그 (스크립트/스타일 등 비가시 영역)
_SKIP_TAGS = {"script", "style", "noscript", "template", "head"}
_WHITESPACE = re.compile(r"\s+")


class _TextExtractor(HTMLParser):
    """가시 텍스트만 모으는 순수 파서 (외부 의존성 없이 stdlib만 사용)."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: object) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._chunks.append(text)

    def text(self) -> str:
        return " ".join(self._chunks)


def extract_text(html: str) -> str:
    """HTML 원문에서 가시 텍스트만 추출해 공백을 정규화한다."""
    parser = _TextExtractor()
    # 깨진 마크업은 파싱 가능한 부분까지만 사용한다.
    with contextlib.suppress(Exception):
        parser.feed(html)
    return _WHITESPACE.sub(" ", parser.text()).strip()


def find_snippets(text: str, keyword: str, radius: int = 80) -> list[str]:
    """text에서 keyword가 등장하는 위치마다 앞뒤 radius 글자의 문맥을 잘라 반환한다.

    대소문자 구분 없이 매칭하며, 겹치지 않는 등장 위치마다 한 개씩 만든다.
    """
    keyword = keyword.strip()
    if not keyword:
        return []

    snippets: list[str] = []
    haystack = text.lower()
    needle = keyword.lower()
    start = 0
    while True:
        idx = haystack.find(needle, start)
        if idx < 0:
            break
        left = max(0, idx - radius)
        right = min(len(text), idx + len(needle) + radius)
        snippet = text[left:right].strip()
        if snippet:
            snippets.append(snippet)
        start = idx + len(needle)
    return snippets
