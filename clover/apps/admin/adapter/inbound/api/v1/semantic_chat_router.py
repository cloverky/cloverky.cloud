from admin.app.dtos.semantic_chat_dto import SemanticChatQuery
from admin.app.ports.input.semantic_chat_use_case import SemanticChatUseCase
from admin.dependencies.semantic_chat_provider import get_semantic_chat_use_case
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

semantic_chat_router = APIRouter(prefix="/langchain", tags=["langchain"])


class SemanticChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="사용자 메시지")


class SemanticChatResponse(BaseModel):
    reply: str
    destination: str = Field(
        ..., description="분류된 의도 — crud | exaone_rag | gemini"
    )
    entities: list[str] = Field(..., description="질문에서 인식된 핵심 단어")


@semantic_chat_router.post("/semantic-chat", response_model=SemanticChatResponse)
async def semantic_chat(
    req: SemanticChatRequest,
    use_case: SemanticChatUseCase = Depends(get_semantic_chat_use_case),
) -> SemanticChatResponse:
    """의도 분류(star_craft) 후 LangChain 챗봇 엔진이 답한다."""
    try:
        result = await use_case.chat(SemanticChatQuery(message=req.message))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SemanticChatResponse(
        reply=result.reply, destination=result.destination, entities=result.entities
    )
