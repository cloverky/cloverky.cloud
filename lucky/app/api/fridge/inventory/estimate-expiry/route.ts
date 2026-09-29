import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { estimateShelfLife } from "@/lib/shelf-life";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const purchasedDate = searchParams.get("purchasedDate") ?? new Date().toISOString().split("T")[0];
  const storage = searchParams.get("storage") ?? "냉장";

  const shelfLifeDays = estimateShelfLife(name, storage);
  const purchased = new Date(purchasedDate);
  const estimated = new Date(purchased);
  estimated.setDate(estimated.getDate() + shelfLifeDays);

  return NextResponse.json({
    name,
    purchased_date: purchasedDate,
    storage,
    shelf_life_days: shelfLifeDays,
    estimated_expiry_date: estimated.toISOString().split("T")[0],
    message: `${name}의 예상 유통기한은 ${shelfLifeDays}일입니다.`,
  });
}
