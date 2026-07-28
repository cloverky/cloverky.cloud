"""Morningstar 인사이트 보조 순수 함수 — 외부 의존 없음."""

from __future__ import annotations

import re

from admin.app.dtos.morningstar_dto import (
    InvestorProfile,
    MarketQuote,
    ResearchExcerpt,
)

_RISK_DIRECTIVE = {
    "conservative": "원금 보존을 최우선으로 본다. 하방 위험·변동성·배당 안정성을 먼저 짚는다.",
    "balanced": "수익과 위험을 균형 있게 본다. 상방 요인과 하방 요인을 같은 비중으로 제시한다.",
    "aggressive": "성장성과 모멘텀을 우선한다. 단, 감내해야 할 최대 낙폭을 반드시 함께 밝힌다.",
}
_HORIZON_DIRECTIVE = {
    "short": "판단 기준은 수주~수개월이다. 단기 촉매와 이벤트 일정을 중심에 둔다.",
    "mid": "판단 기준은 6~18개월이다. 실적 추세와 업황 사이클을 중심에 둔다.",
    "long": "판단 기준은 3년 이상이다. 구조적 경쟁우위와 산업 구조 변화를 중심에 둔다.",
}

_STOPWORDS = {
    "그리고",
    "무엇",
    "어떻게",
    "어떤",
    "알려줘",
    "대해",
    "지금",
    "the",
    "and",
    "for",
    "what",
    "how",
    "about",
}


def profile_directive(profile: InvestorProfile) -> str:
    """투자자 프로필 → 시스템 프롬프트에 주입할 맞춤 지시문."""
    lines = [
        _RISK_DIRECTIVE.get(profile.risk_appetite, _RISK_DIRECTIVE["balanced"]),
        _HORIZON_DIRECTIVE.get(profile.horizon, _HORIZON_DIRECTIVE["mid"]),
    ]
    if profile.interests:
        lines.append(
            f"관심 분야는 {', '.join(profile.interests)}이며 이를 우선 연결한다."
        )
    return " ".join(lines)


def keywords_of(question: str, tickers: list[str], limit: int = 8) -> list[str]:
    """질문·티커에서 검색 키워드를 뽑는다 (소문자, 2자 이상, 중복 제거)."""
    tokens = re.findall(r"[A-Za-z0-9]+|[가-힣]{2,}", question.lower())
    keywords: list[str] = [t.lower() for t in tickers]
    for token in tokens:
        if len(token) >= 2 and token not in _STOPWORDS and token not in keywords:
            keywords.append(token)
    return keywords[:limit]


def market_context(quotes: list[MarketQuote]) -> str:
    if not quotes:
        return "(실시간 시세를 가져오지 못했다. 시세 기반 단정은 피한다.)"
    return "\n".join(
        f"- {q.ticker}: {q.price:,.2f} {q.currency} "
        f"(전일 종가 {q.previous_close:,.2f}, 등락 {q.change_percent:+.2f}%, "
        f"기준 {q.as_of:%Y-%m-%d %H:%M} UTC)"
        for q in quotes
    )


def research_context(excerpts: list[ResearchExcerpt]) -> str:
    if not excerpts:
        return "(검색된 리서치 문서가 없다. 근거 부족을 명시한다.)"
    return "\n\n".join(f"[{e.source}] {e.text}" for e in excerpts)
