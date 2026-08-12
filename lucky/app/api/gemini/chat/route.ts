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
      // 오리진이 내려가 있으면 Cloudflare 가 HTML 오류 페이지를 돌려준다.
      // 그걸 그대로 잘라 화면에 뿌리면 사용자에게는 <!DOCTYPE html> 만 보인다.
      // 백엔드가 준 detail 이 있을 때만 쓰고, 아니면 사실만 말한다.
      const detail = await readDetail(res);
      return NextResponse.json(
        { error: detail ?? "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." },
        { status: 503 },
      );
    }

    const data = (await res.json()) as { reply: string };
    return NextResponse.json({ reply: data.reply });
  } catch {
    // fetch 자체가 실패한 경우 — 원인을 모르므로 내부 메시지를 노출하지 않는다.
    return NextResponse.json(
      { error: "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}

/** 백엔드(FastAPI)가 준 detail 만 꺼낸다. JSON 이 아니면 null. */
async function readDetail(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body.detail === "string" && body.detail.trim()
      ? body.detail
      : null;
  } catch {
    return null;
  }
}
