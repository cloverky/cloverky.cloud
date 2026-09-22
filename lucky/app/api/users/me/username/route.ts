import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });
  }

  const { username } = (await req.json()) as { username: string };
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && String(existing.id) !== user.sub) {
    return NextResponse.json({ detail: "이미 사용 중인 사용자명입니다." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: parseInt(user.sub) },
    data: { username },
  });

  return NextResponse.json({ username });
}
