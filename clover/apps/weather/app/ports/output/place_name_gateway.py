from __future__ import annotations

from abc import ABC, abstractmethod


class PlaceNameGateway(ABC):
    @abstractmethod
    def korean_name(self, lat: float, lon: float) -> str | None:
        pass
