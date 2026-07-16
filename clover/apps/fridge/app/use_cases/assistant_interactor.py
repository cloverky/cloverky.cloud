from __future__ import annotations

from fridge.app.dtos.assistant_dto import AssistantChatCommand, AssistantChatResultDto
from fridge.app.dtos.inventory_dto import InventoryItemDto
from fridge.app.ports.input.assistant_use_case import AssistantUseCase
from fridge.app.ports.input.inventory_use_case import InventoryUseCase
from fridge.app.ports.output.assistant_gateway import AssistantGatewayPort

_SYSTEM_PROMPT = (
    "당신은 FridgeAI의 냉장고 재고 관리 도우미입니다. "
    "아래 사용자의 현재 냉장고 재고 목록을 참고하여, 재고 현황이나 유통기한에 대한 질문에 답하거나 "
    "지금 소비해야 할 재료를 우선 활용한 레시피를 한국어로 간결하게 제안해 주세요. "
    "재고에 없는 재료를 마음대로 지어내지 마세요."
)


def _format_inventory(items: list[InventoryItemDto]) -> str:
    if not items:
        return "(재고 없음)"
    lines = [
        f"- {item.name} {item.quantity_label} "
        f"(유통기한: {item.expiry_date or '미상'}, 상태: {item.status})"
        for item in items
    ]
    return "\n".join(lines)


class AssistantInteractor(AssistantUseCase):
    def __init__(
        self, inventory: InventoryUseCase, gateway: AssistantGatewayPort
    ) -> None:
        self.inventory = inventory
        self.gateway = gateway

    async def chat(self, cmd: AssistantChatCommand) -> AssistantChatResultDto:
        inventory_list = await self.inventory.list_inventory(cmd.user_email)
        print(f"[AssistantInteractor] inventory items={len(inventory_list.items)}")
        messages = [
            {
                "role": "system",
                "content": (
                    f"{_SYSTEM_PROMPT}\n\n현재 재고:\n"
                    f"{_format_inventory(inventory_list.items)}"
                ),
            },
            {"role": "user", "content": cmd.message},
        ]
        print(f"[AssistantInteractor] -> gateway.chat messages={messages}")
        reply = await self.gateway.chat(messages)
        print(f"[AssistantInteractor] <- gateway reply={reply!r}")
        return AssistantChatResultDto(reply=reply.strip())
