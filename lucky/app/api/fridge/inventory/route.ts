import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { toItem } from "@/lib/inventory-item";
import { addDays, estimateShelfLife } from "@/lib/shelf-life";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: parseInt(user.sub) },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
  });

  // 유통기한이 추정값일 수 있어 DB 정렬 대신 계산된 날짜로 다시 정렬한다 (없는 건 뒤로).
  const mapped = items
    .map(toItem)
    .sort((a, b) => (a.expiry_date ?? "9999").localeCompare(b.expiry_date ?? "9999"));
  const expiringSoon = mapped.filter((i) => i.status === "임박" || i.status === "만료").length;
  const lowStock = mapped.filter((i) => i.status === "부족").length;

  return NextResponse.json({
    items: mapped,
    stats: { total: mapped.length, expiring_soon: expiringSoon, low_stock: lowStock },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as {
    name: string;
    quantity: number;
    unit: string;
    expiry_date?: string | null;
    purchased_date?: string | null;
    storage: string;
    min_quantity?: number;
  };

  const storage = body.storage ?? "냉장";
  const purchasedDate = body.purchased_date ? new Date(body.purchased_date) : null;
  // 유통기한 없이 구매일만 오면(영수증 스캔) 구매일 + 보관 기간으로 추정해 저장한다.
  const shelfLifeDays =
    !body.expiry_date && purchasedDate ? estimateShelfLife(body.name, storage) : null;

  const item = await prisma.inventoryItem.create({
    data: {
      userId: parseInt(user.sub),
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      expiryDate: body.expiry_date
        ? new Date(body.expiry_date)
        : purchasedDate && shelfLifeDays !== null
          ? addDays(purchasedDate, shelfLifeDays)
          : null,
      expiryIsEstimated: shelfLifeDays !== null,
      shelfLifeDays,
      purchasedDate,
      storage,
      minQuantity: body.min_quantity ?? 0,
    },
  });

  return NextResponse.json(toItem(item), { status: 201 });
}
