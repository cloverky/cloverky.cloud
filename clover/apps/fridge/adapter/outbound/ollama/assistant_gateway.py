from __future__ import annotations

from core.lol.t1_mid_faker_orchestrator import FakerOrchestrator
from fridge.app.ports.output.assistant_gateway import AssistantGatewayPort


class OllamaAssistantGateway(AssistantGatewayPort):
    def __init__(self, orchestrator: FakerOrchestrator) -> None:
        self._orchestrator = orchestrator

    async def chat(self, messages: list[dict[str, str]]) -> str:
        print(
            f"[OllamaAssistantGateway] -> orchestrator.achat ({len(messages)} messages)"
        )
        return await self._orchestrator.achat(messages)
