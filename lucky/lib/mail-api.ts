const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export type EmailType = "test" | "notification" | "alert" | "report";

export type SendMailParams = {
  to: string;
  subject: string;
  context: string;
  email_type?: EmailType;
};

export type InboxItem = {
  id: number;
  from_email: string;
  subject: string | null;
  body: string | null;
  received_at: string;
};

export async function sendMail(params: SendMailParams): Promise<void> {
  const res = await fetch(`${API_BASE}/messenger/mail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_type: "notification", ...params }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? `발송 실패 (${res.status})`);
  }
}

export async function fetchInbox(limit = 50): Promise<InboxItem[]> {
  const res = await fetch(`${API_BASE}/messenger/mail/inbox?limit=${limit}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items: InboxItem[] };
  return data.items ?? [];
}

export async function deleteInboxItem(id: number): Promise<void> {
  await fetch(`${API_BASE}/messenger/mail/inbox/${id}`, { method: "DELETE" });
}

export async function deleteAllInbox(): Promise<void> {
  await fetch(`${API_BASE}/messenger/mail/inbox`, { method: "DELETE" });
}
