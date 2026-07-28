from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class InvestorProfile:
    """맞춤형 프롬프팅의 입력 — 같은 질문도 프로필에 따라 다르게 답한다."""

    risk_appetite: str  # conservative | balanced | aggressive
    horizon: str  # short | mid | long
    interests: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class InsightQuery:
    question: str
    tickers: list[str]
    profile: InvestorProfile


@dataclass(frozen=True)
class MarketQuote:
    """실시간 시세 스냅샷."""

    ticker: str
    price: float
    currency: str
    previous_close: float
    change_percent: float
    as_of: datetime


@dataclass(frozen=True)
class ResearchExcerpt:
    """적재된 리서치 문서에서 뽑아낸 근거."""

    source: str
    text: str
    updated_at: str


@dataclass(frozen=True)
class FinancialInsight:
    question: str
    answer: str
    quotes: list[MarketQuote]
    sources: list[str]
    generated_at: datetime
