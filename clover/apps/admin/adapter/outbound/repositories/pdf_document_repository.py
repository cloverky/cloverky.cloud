from __future__ import annotations

from datetime import UTC, datetime

from admin.app.dtos.pdf_loader_dto import PdfDocumentRecord
from admin.app.ports.output.pdf_document_port import PdfDocumentPort

from star_craft.app.ports.output.graph_repository import GraphRepository

# 002-neo4j-harness.md — 라벨 PascalCase 단수, 속성 snake_case, 식별 속성은 name 고정
_LABEL = "PdfDocument"


class PdfDocumentGraphRepository(PdfDocumentPort):
    """요약 결과를 Neo4j (:PdfDocument) 노드로 upsert한다.

    스타 토폴로지 규칙에 따라 그래프 접근은 허브(star_craft)의
    GraphRepository 포트만 사용한다 — 자체 드라이버를 만들지 않는다.
    """

    def __init__(self, graph: GraphRepository) -> None:
        self._graph = graph

    async def save(self, record: PdfDocumentRecord) -> str:
        props = {
            "name": record.filename,  # upsert_node의 MERGE 기준 키
            "uid": record.uid,
            "summary": record.summary,
            "char_count": record.char_count,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        return await self._graph.upsert_node(_LABEL, props)
