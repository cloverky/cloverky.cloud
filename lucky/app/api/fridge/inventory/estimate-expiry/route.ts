import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

// 일반적인 식품 유통기한 (일 단위) - 냉장 기준
const SHELF_LIFE_DB: Record<string, number> = {
  // 육류
  돼지: 3, 삼겹: 3, 목살: 3, 갈비: 3, 소고기: 3, 한우: 3, 쇠고기: 3,
  닭: 2, 닭고기: 2, 닭가슴살: 2, 오리: 3,
  // 해산물
  생선: 2, 고등어: 2, 연어: 2, 새우: 2, 오징어: 2, 조개: 1,
  // 유제품
  우유: 7, 요거트: 14, 치즈: 14, 버터: 30,
  // 채소
  시금치: 5, 상추: 5, 양배추: 7, 브로콜리: 5, 당근: 14,
  토마토: 7, 오이: 7, 파프리카: 7, 감자: 30, 고구마: 30,
  // 과일
  사과: 14, 배: 14, 딸기: 3, 포도: 5, 바나나: 5,
  // 달걀
  달걀: 21, 계란: 21,
  // 기타
  두부: 3, 콩나물: 3, 숙주: 2,
};

function estimateShelfLife(name: string, storage: string): number {
  const n = name.trim().toLowerCase();
  for (const [key, days] of Object.entries(SHELF_LIFE_DB)) {
    if (n.includes(key)) {
      // 냉동이면 10배, 실온이면 절반
      if (storage === "냉동") return days * 10;
      if (storage === "실온") return Math.max(1, Math.floor(days / 2));
      return days;
    }
  }
  // 기본값: 냉장 7일
  if (storage === "냉동") return 90;
  if (storage === "실온") return 3;
  return 7;
}

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
