from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable, Mapping


class JsonlSinkPort(ABC):
    @abstractmethod
    def write(self, destination: str, records: Iterable[Mapping[str, object]]) -> str:
        """records를 destination 디렉터리에 jsonl 파일로 적재하고 파일 경로를 반환한다."""
        pass
