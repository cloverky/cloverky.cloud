import { NextResponse } from "next/server";

export const maxDuration = 60;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ClientMessage[] };
    const raw = body.messages ?? [];
    const messages = raw.filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    );
    if (!messages.length) {
      return NextResponse.json(
        { error: "보낼 메시지가 없습니다.\n입력란에 내용을 적은 뒤 다시 시도해 주세요." },
        { status: 400 },
      );
    }

    const last = messages[messages.length - 1];
    if (last.role !== "user") {
      return NextResponse.json(
        { error: "대화 순서가 올바르지 않습니다.\n새로고침 후 처음부터 다시 시도해 주세요." },
        { status: 400 },
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cloverky.cloud";
    const res = await fetch(`${apiUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: last.content }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `백엔드 오류 (${res.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { reply: string };
    return NextResponse.json({ reply: data.reply });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "알 수 없는 오류";
    const message =
      raw.length > 200
        ? `${raw.slice(0, 200)}…\n\n(메시지가 잘렸습니다. 터미널 로그를 함께 확인해 주세요.)`
        : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
