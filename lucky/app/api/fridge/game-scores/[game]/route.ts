import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ game: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { game } = await params;
  const scores = await prisma.gameScore.findMany({
    where: { userId: parseInt(user.sub), game },
    orderBy: { score: "desc" },
    take: 10,
  });

  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ game: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { game } = await params;
  const { score } = (await req.json()) as { score: number };

  const record = await prisma.gameScore.create({
    data: { userId: parseInt(user.sub), game, score },
  });

  return NextResponse.json({ id: record.id, game, score, createdAt: record.createdAt }, { status: 201 });
}
