import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";

function toItem(row: {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  quantityLabel: string;
  expiryDate: Date | null;
  purchasedDate: Date | null;
  expiryIsEstimated: boolean;
  shelfLifeDays: number | null;
  storage: string;
  minQuantity: number;
  status: string;
}) {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    quantity_label: row.quantityLabel,
    expiry_date: row.expiryDate?.toISOString().split("T")[0] ?? null,
    purchased_date: row.purchasedDate?.toISOString().split("T")[0] ?? null,
    expiry_is_estimated: row.expiryIsEstimated,
    shelf_life_days: row.shelfLifeDays,
    storage: row.storage,
    min_quantity: row.minQuantity,
    status: computeStatus(row),
  };
}

function computeStatus(row: { expiryDate: Date | null; quantity: number; minQuantity: number }): string {
  const today = new Date();
  if (row.expiryDate) {
    const daysLeft = Math.ceil((row.expiryDate.getTime() - today.getTime()) / 86400000);
    if (daysLeft <= 0) return "만료";
    if (daysLeft <= 3) return "임박";
  }
  if (row.minQuantity > 0 && row.quantity <= row.minQuantity) return "부족";
  return "정상";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: parseInt(user.sub) },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
  });

  const mapped = items.map(toItem);
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

  const item = await prisma.inventoryItem.create({
    data: {
      userId: parseInt(user.sub),
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      expiryDate: body.expiry_date ? new Date(body.expiry_date) : null,
      purchasedDate: body.purchased_date ? new Date(body.purchased_date) : null,
      storage: body.storage ?? "냉장",
      minQuantity: body.min_quantity ?? 0,
    },
  });

  return NextResponse.json(toItem(item), { status: 201 });
}
