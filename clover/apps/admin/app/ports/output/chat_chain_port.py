from __future__ import annotations

from abc import ABC, abstractmethod


class ChatChainPort(ABC):
    @abstractmethod
    async def run(self, message: str, destination: str, entities: list[str]) -> str:
        """분류 결과(destination·entities)를 반영해 대화 응답을 생성한다. 실패 시 RuntimeError."""
        pass
