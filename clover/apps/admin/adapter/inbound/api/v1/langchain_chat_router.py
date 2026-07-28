from admin.adapter.outbound.langchain.simple_chat_chain import SimpleChatChain
from admin.dependencies.langchain_chat_provider import get_langchain_chat_chain
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

langchain_chat_router = APIRouter(prefix="/langchain", tags=["langchain"])


class LangchainChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="사용자 메시지")


class LangchainChatResponse(BaseModel):
    reply: str


@langchain_chat_router.post("/chat", response_model=LangchainChatResponse)
async def langchain_chat(
    req: LangchainChatRequest,
    chain: SimpleChatChain = Depends(get_langchain_chat_chain),
) -> LangchainChatResponse:
    """LangChain LCEL 기반 범용 채팅."""
    try:
        reply = await chain.run(req.message)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return LangchainChatResponse(reply=reply)
