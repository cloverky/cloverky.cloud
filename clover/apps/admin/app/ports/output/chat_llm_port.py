from __future__ import annotations

from abc import ABC, abstractmethod


class ChatLlmPort(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """system/user 프롬프트로 1회 생성한다. 실패 시 RuntimeError."""
        pass
