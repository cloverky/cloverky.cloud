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
  const today = new Date();
  let computedStatus = row.status;
  if (row.expiryDate) {
    const daysLeft = Math.ceil((row.expiryDate.getTime() - today.getTime()) / 86400000);
    if (daysLeft <= 0) computedStatus = "만료";
    else if (daysLeft <= 3) computedStatus = "임박";
  }
  if (row.minQuantity > 0 && row.quantity <= row.minQuantity) computedStatus = "부족";

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
    status: computedStatus,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), userId: parseInt(user.sub) },
  });
  if (!item) return NextResponse.json({ detail: "항목을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json(toItem(item));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Partial<{
    name: string;
    quantity: number;
    unit: string;
    expiry_date: string | null;
    purchased_date: string | null;
    storage: string;
    min_quantity: number;
  }>;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), userId: parseInt(user.sub) },
  });
  if (!item) return NextResponse.json({ detail: "항목을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.inventoryItem.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.expiry_date !== undefined && {
        expiryDate: body.expiry_date ? new Date(body.expiry_date) : null,
      }),
      ...(body.purchased_date !== undefined && {
        purchasedDate: body.purchased_date ? new Date(body.purchased_date) : null,
      }),
      ...(body.storage !== undefined && { storage: body.storage }),
      ...(body.min_quantity !== undefined && { minQuantity: body.min_quantity }),
    },
  });

  return NextResponse.json(toItem(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), userId: parseInt(user.sub) },
  });
  if (!item) return NextResponse.json({ detail: "항목을 찾을 수 없습니다." }, { status: 404 });

  await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
  return new NextResponse(null, { status: 204 });
}
