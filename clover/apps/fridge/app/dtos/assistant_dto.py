from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AssistantChatCommand:
    user_email: str
    message: str


@dataclass(frozen=True)
class AssistantChatResultDto:
    reply: str
