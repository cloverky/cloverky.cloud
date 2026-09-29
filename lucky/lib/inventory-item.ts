import { addDays, estimateShelfLife } from "@/lib/shelf-life";

type InventoryRow = {
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
};

/** 유통기한이 없고 구매일만 있으면 구매일 + 보관 기간으로 추정한다. */
function effectiveExpiry(row: InventoryRow): { date: Date | null; estimated: boolean } {
  if (row.expiryDate) return { date: row.expiryDate, estimated: row.expiryIsEstimated };
  if (!row.purchasedDate) return { date: null, estimated: false };
  const days = row.shelfLifeDays ?? estimateShelfLife(row.name, row.storage);
  return { date: addDays(row.purchasedDate, days), estimated: true };
}

/** 유통기한(만료·임박)이 재고 부족보다 우선한다. 부족은 최소 수량 "미만"일 때. */
function computeStatus(expiry: Date | null, quantity: number, minQuantity: number): string {
  if (expiry) {
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return "만료";
    if (daysLeft <= 3) return "임박";
  }
  if (minQuantity > 0 && quantity < minQuantity) return "부족";
  return "정상";
}

/** DB 행을 화면용 재고 항목(snake_case)으로 바꾼다. 재고 API 라우트들이 같이 쓴다. */
export function toItem(row: InventoryRow) {
  const expiry = effectiveExpiry(row);
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    quantity_label: row.quantityLabel || `${row.quantity}${row.unit}`,
    expiry_date: expiry.date?.toISOString().split("T")[0] ?? null,
    purchased_date: row.purchasedDate?.toISOString().split("T")[0] ?? null,
    expiry_is_estimated: expiry.estimated,
    shelf_life_days: row.shelfLifeDays,
    storage: row.storage,
    min_quantity: row.minQuantity,
    status: computeStatus(expiry.date, row.quantity, row.minQuantity),
  };
}
