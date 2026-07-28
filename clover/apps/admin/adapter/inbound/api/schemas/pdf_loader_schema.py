from admin.app.dtos.pdf_loader_dto import PdfSummaryResult
from pydantic import BaseModel, Field


class PdfSummaryResponse(BaseModel):
    uid: str = Field(..., description="문서 UID (neo4j-graphrag DocumentInfo.uid)")
    filename: str = Field(..., description="업로드된 파일명")
    summary: str = Field(..., description="LLM이 생성한 한국어 요약")
    char_count: int = Field(..., description="추출된 원문 글자 수")
    node_id: str = Field(..., description="Neo4j (:PdfDocument) 노드 elementId")
    preview: str = Field(..., description="원문 앞부분 미리보기")

    model_config = {
        "json_schema_extra": {
            "example": {
                "uid": "fb35819a-4383-4470-8622-9873fe4a5bd9",
                "filename": "SPRi AI Brief_6월호_산업동향_F.pdf",
                "summary": "- EU 집행위원회가 「AI 법」의 AI 정의 …",
                "char_count": 48210,
                "node_id": "4:9f0c…:123",
                "preview": "2025년6월호 인공지능 산업의 최신 동향 SPRi AI Brief …",
            }
        }
    }


def to_pdf_summary_response(result: PdfSummaryResult) -> PdfSummaryResponse:
    return PdfSummaryResponse(
        uid=result.uid,
        filename=result.filename,
        summary=result.summary,
        char_count=result.char_count,
        node_id=result.node_id,
        preview=result.preview,
    )
