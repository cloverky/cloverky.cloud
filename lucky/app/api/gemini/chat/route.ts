import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json(
        {
          error:
            "Google AI(Gemini) API 키가 아직 설정되지 않았습니다.\n\n프로젝트의 frontend 폴더에 .env.local 파일을 만들고, GEMINI_API_KEY=발급받은_키 형식으로 넣은 다음 개발 서버를 다시 실행해 주세요.",
        },
        { status: 503 },
      );
    }

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

    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prior = messages.slice(0, -1);
    const history = prior.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(last.content);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "알 수 없는 오류";
    const message =
      raw.length > 200
        ? `${raw.slice(0, 200)}…\n\n(메시지가 잘렸습니다. 터미널 로그를 함께 확인해 주세요.)`
        : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
