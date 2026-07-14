from fastapi import Depends

from core.lol.t1_mid_faker_orchestrator import get_faker_orchestrator
from fridge.adapter.outbound.ollama.assistant_gateway import OllamaAssistantGateway
from fridge.app.ports.input.assistant_use_case import AssistantUseCase
from fridge.app.ports.input.inventory_use_case import InventoryUseCase
from fridge.app.ports.output.assistant_gateway import AssistantGatewayPort
from fridge.app.use_cases.assistant_interactor import AssistantInteractor
from fridge.dependencies.inventory_provider import get_inventory_use_case


def get_assistant_use_case(
    inventory: InventoryUseCase = Depends(get_inventory_use_case),
) -> AssistantUseCase:
    gateway: AssistantGatewayPort = OllamaAssistantGateway(
        orchestrator=get_faker_orchestrator()
    )
    return AssistantInteractor(inventory=inventory, gateway=gateway)
