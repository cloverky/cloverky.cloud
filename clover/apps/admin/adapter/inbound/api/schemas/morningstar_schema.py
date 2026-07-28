from datetime import datetime
from typing import Literal

from admin.app.dtos.morningstar_dto import (
    FinancialInsight,
    InsightQuery,
    InvestorProfile,
)
from pydantic import BaseModel, Field


class InvestorProfileSchema(BaseModel):
    risk_appetite: Literal["conservative", "balanced", "aggressive"] = "balanced"
    horizon: Literal["short", "mid", "long"] = "mid"
    interests: list[str] = Field(default_factory=list, description="관심 섹터·테마")


class InsightRequest(BaseModel):
    question: str = Field(..., min_length=2, description="금융 전문가의 질문")
    tickers: list[str] = Field(
        default_factory=list, description="실시간 시세 조회 대상"
    )
    profile: InvestorProfileSchema = Field(default_factory=InvestorProfileSchema)

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "마이크로소프트의 AI 인프라 투자가 단기 실적에 부담인가?",
                "tickers": ["MSFT", "NVDA"],
                "profile": {
                    "risk_appetite": "balanced",
                    "horizon": "mid",
                    "interests": ["AI 인프라", "클라우드"],
                },
            }
        }
    }


class MarketQuoteSchema(BaseModel):
    ticker: str
    price: float
    currency: str
    previous_close: float
    change_percent: float
    as_of: datetime


class InsightResponse(BaseModel):
    question: str
    answer: str
    quotes: list[MarketQuoteSchema]
    sources: list[str] = Field(..., description="근거로 사용한 리서치 문서명")
    generated_at: datetime


def to_insight_query(request: InsightRequest) -> InsightQuery:
    return InsightQuery(
        question=request.question,
        tickers=[t.strip().upper() for t in request.tickers if t.strip()],
        profile=InvestorProfile(
            risk_appetite=request.profile.risk_appetite,
            horizon=request.profile.horizon,
            interests=request.profile.interests,
        ),
    )


def to_insight_response(insight: FinancialInsight) -> InsightResponse:
    return InsightResponse(
        question=insight.question,
        answer=insight.answer,
        quotes=[
            MarketQuoteSchema(
                ticker=q.ticker,
                price=q.price,
                currency=q.currency,
                previous_close=q.previous_close,
                change_percent=q.change_percent,
                as_of=q.as_of,
            )
            for q in insight.quotes
        ],
        sources=insight.sources,
        generated_at=insight.generated_at,
    )
