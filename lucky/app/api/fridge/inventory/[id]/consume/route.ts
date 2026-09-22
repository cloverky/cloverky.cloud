import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";

function toItem(row: {
  id: number; name: string; quantity: number; unit: string; quantityLabel: string;
  expiryDate: Date | null; purchasedDate: Date | null; expiryIsEstimated: boolean;
  shelfLifeDays: number | null; storage: string; minQuantity: number; status: string;
}) {
  const today = new Date();
  let status = row.status;
  if (row.expiryDate) {
    const d = Math.ceil((row.expiryDate.getTime() - today.getTime()) / 86400000);
    if (d <= 0) status = "만료";
    else if (d <= 3) status = "임박";
  }
  if (row.minQuantity > 0 && row.quantity <= row.minQuantity) status = "부족";
  return {
    id: row.id, name: row.name, quantity: row.quantity, unit: row.unit,
    quantity_label: row.quantityLabel,
    expiry_date: row.expiryDate?.toISOString().split("T")[0] ?? null,
    purchased_date: row.purchasedDate?.toISOString().split("T")[0] ?? null,
    expiry_is_estimated: row.expiryIsEstimated, shelf_life_days: row.shelfLifeDays,
    storage: row.storage, min_quantity: row.minQuantity, status,
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { amount = 1 } = (await req.json()) as { amount?: number };

  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), userId: parseInt(user.sub) },
  });
  if (!item) return NextResponse.json({ detail: "항목을 찾을 수 없습니다." }, { status: 404 });

  const newQty = item.quantity - amount;

  if (newQty <= 0) {
    await prisma.inventoryItem.delete({ where: { id: item.id } });
    return NextResponse.json({ item: null, removed: true, message: "항목이 삭제되었습니다." });
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { quantity: newQty },
  });

  return NextResponse.json({ item: toItem(updated), removed: false, message: "소비 완료" });
}
