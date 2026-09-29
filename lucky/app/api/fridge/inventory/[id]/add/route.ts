import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { toItem } from "@/lib/inventory-item";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { amount = 1 } = (await req.json()) as { amount?: number };

  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), userId: parseInt(user.sub) },
  });
  if (!item) return NextResponse.json({ detail: "항목을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { quantity: item.quantity + amount },
  });

  return NextResponse.json({ item: toItem(updated), removed: false, message: "수량 추가 완료" });
}
