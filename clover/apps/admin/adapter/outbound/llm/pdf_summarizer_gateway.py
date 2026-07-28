"""PDF 요약 게이트웨이 — 요약 프롬프트만 소유하고 호출은 ChatLlmPort에 위임한다."""

from __future__ import annotations

from admin.app.ports.output.chat_llm_port import ChatLlmPort
from admin.app.ports.output.pdf_summarizer_port import PdfSummarizerPort

_SYSTEM_PROMPT = (
    "너는 문서 요약 전문가다. 주어진 PDF 발췌를 한국어로 요약한다. "
    "핵심 주제·수치·고유명사를 보존하고, 원문에 없는 내용은 만들지 않는다. "
    "5~8개의 불릿으로만 답한다."
)


class LlmPdfSummarizerGateway(PdfSummarizerPort):
    def __init__(self, chat: ChatLlmPort) -> None:
        self._chat = chat

    async def summarize(self, text: str) -> str:
        return await self._chat.complete(_SYSTEM_PROMPT, text)
