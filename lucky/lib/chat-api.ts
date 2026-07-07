/** FastAPI 백엔드 (Swagger: POST /chat) */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type ChatApiResponse = { reply: string };
type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

type GeminiMessage = { role: "user" | "assistant"; content: string };

/** Next.js Route Handler POST /api/gemini/chat — 대화 히스토리 전체 전달 */
export async function postGeminiChat(messages: GeminiMessage[]): Promise<string> {
  const res = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = (await res.json()) as { reply?: string; error?: string } & FastApiErrorBody;

  if (!res.ok) {
    throw new Error(data.error ?? parseApiError(data, res.status));
  }

  return data.reply?.trim() ?? "";
}

/** 백엔드 POST /chat — 본문: { "message": "..." }, 응답: { "reply": "..." } */
export async function postBackendChat(message: string): Promise<string> {
  return postSmithChat(message);
}

/** 백엔드 POST /smith/chat — 본문: { "message": "..." }, 응답: { "reply": "..." } */
export async function postSmithChat(message: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/titanic/smith/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = (await res.json()) as ChatApiResponse & FastApiErrorBody;

  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }

  return data.reply?.trim() ?? "";
}
