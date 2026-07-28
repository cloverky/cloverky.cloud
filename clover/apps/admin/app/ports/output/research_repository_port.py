from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.morningstar_dto import ResearchExcerpt


class ResearchRepositoryPort(ABC):
    @abstractmethod
    async def search(self, keywords: list[str], limit: int) -> list[ResearchExcerpt]:
        """적재된 리서치 문서에서 키워드에 걸리는 발췌를 최신순으로 반환한다."""
        pass
