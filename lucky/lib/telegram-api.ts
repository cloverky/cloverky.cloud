const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export type SendTelegramParams = {
  chat_id: string;
  text: string;
};

export async function sendTelegram(params: SendTelegramParams): Promise<void> {
  const res = await fetch(`${API_BASE}/messenger/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? `전송 실패 (${res.status})`);
  }
}

/** 백엔드 TELEGRAM_CHAT_ID(내 Chat ID)로 알림 전송 */
export async function notifyMe(text: string): Promise<void> {
  const res = await fetch(`${API_BASE}/messenger/telegram/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = (await res.json()).catch?.(() => ({})) as { detail?: string };
    throw new Error(data?.detail ?? `알림 실패 (${res.status})`);
  }
}
