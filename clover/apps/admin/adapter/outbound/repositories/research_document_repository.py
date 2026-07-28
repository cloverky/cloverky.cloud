"""리서치 근거 검색 — PDF 파이프라인이 적재한 (:PdfDocument) 노드를 조회한다."""

from __future__ import annotations

from typing import Any

from admin.app.dtos.morningstar_dto import ResearchExcerpt
from admin.app.ports.output.research_repository_port import ResearchRepositoryPort

from star_craft.app.ports.output.graph_repository import GraphRepository

# 라벨·속성 정의는 002-neo4j-harness.md 규칙을 따른다.
_SEARCH_CYPHER = """
MATCH (d:PdfDocument)
WHERE any(k IN $keywords
          WHERE toLower(d.summary) CONTAINS k OR toLower(d.name) CONTAINS k)
RETURN d.name AS name, d.summary AS summary, d.updated_at AS updated_at
ORDER BY d.updated_at DESC
LIMIT $limit
"""

_LATEST_CYPHER = """
MATCH (d:PdfDocument)
RETURN d.name AS name, d.summary AS summary, d.updated_at AS updated_at
ORDER BY d.updated_at DESC
LIMIT $limit
"""


class ResearchDocumentGraphRepository(ResearchRepositoryPort):
    def __init__(self, graph: GraphRepository) -> None:
        self._graph = graph

    async def search(self, keywords: list[str], limit: int) -> list[ResearchExcerpt]:
        rows: list[dict[str, Any]] = []
        if keywords:
            rows = await self._graph.query(
                _SEARCH_CYPHER, {"keywords": keywords, "limit": limit}
            )
        if not rows:
            # 키워드가 걸리지 않으면 최신 문서로 대체한다 (근거 0건 방지).
            rows = await self._graph.query(_LATEST_CYPHER, {"limit": limit})

        return [
            ResearchExcerpt(
                source=str(row.get("name", "")),
                text=str(row.get("summary", "")),
                updated_at=str(row.get("updated_at", "")),
            )
            for row in rows
        ]
