import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const username = new URL(req.url).searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ detail: "username 파라미터가 필요합니다" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({
    username,
    available: !existing,
    message: existing ? "이미 사용 중인 사용자명입니다." : "사용 가능한 사용자명입니다.",
  });
}
