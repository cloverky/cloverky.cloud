from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from fridge.app.dtos.assistant_dto import AssistantChatCommand
from fridge.app.ports.input.assistant_use_case import AssistantUseCase
from fridge.dependencies.assistant_provider import get_assistant_use_case

assistant_router = APIRouter(prefix="/assistant", tags=["assistant"])


class AssistantChatBody(BaseModel):
    message: str


@assistant_router.post("/chat")
async def chat(
    body: AssistantChatBody,
    x_user_email: str = Header(...),
    use_case: AssistantUseCase = Depends(get_assistant_use_case),
):
    try:
        result = await use_case.chat(
            AssistantChatCommand(user_email=x_user_email, message=body.message)
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"reply": result.reply}
