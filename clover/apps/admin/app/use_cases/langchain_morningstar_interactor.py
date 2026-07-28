from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from admin.app.dtos.morningstar_dto import FinancialInsight, InsightQuery
from admin.app.ports.input.morningstar_use_case import MorningstarUseCase
from admin.app.ports.output.insight_chain_port import InsightChainPort
from admin.app.ports.output.market_data_port import MarketDataPort
from admin.app.ports.output.research_repository_port import ResearchRepositoryPort
from admin.app.use_cases._morningstar_prompt import (
    keywords_of,
    market_context,
    profile_directive,
    research_context,
)

# 컨텍스트 상한 — 소스가 늘수록 지연·비용이 누적된다 (003-langchain-harness.md §3)
_RESEARCH_LIMIT = 5


class LangchainMorningstarInteractor(MorningstarUseCase):
    """실시간 시세 + 리서치 검색 + 맞춤형 프롬프팅 오케스트레이션.

    LangChain은 InsightChainPort 뒤(어댑터)에만 존재한다.
    """

    def __init__(
        self,
        market: MarketDataPort,
        research: ResearchRepositoryPort,
        chain: InsightChainPort,
        research_limit: int = _RESEARCH_LIMIT,
    ) -> None:
        self.market = market
        self.research = research
        self.chain = chain
        self.research_limit = research_limit

    async def generate_insight(self, query: InsightQuery) -> FinancialInsight:
        if not query.question.strip():
            raise ValueError("질문이 비어 있습니다.")

        keywords = keywords_of(query.question, query.tickers)
        # 외부 소스 호출은 병렬로 — 전체 지연을 합이 아닌 최댓값으로 유지한다.
        quotes, excerpts = await asyncio.gather(
            self.market.quotes(query.tickers),
            self.research.search(keywords, self.research_limit),
        )

        answer = await self.chain.run(
            question=query.question,
            profile_directive=profile_directive(query.profile),
            market_context=market_context(quotes),
            research_context=research_context(excerpts),
        )

        return FinancialInsight(
            question=query.question,
            answer=answer,
            quotes=quotes,
            sources=[excerpt.source for excerpt in excerpts],
            generated_at=datetime.now(UTC),
        )
