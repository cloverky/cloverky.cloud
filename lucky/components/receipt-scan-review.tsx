"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVENTORY_STORAGE,
  INVENTORY_UNITS,
  fetchExpiryEstimate,
  type InventoryItemPayload,
} from "@/lib/inventory-api";
import type { ReceiptScanResult } from "@/lib/receipt-scan-api";
import { cn } from "@/lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type DateMode = "purchase" | "expiry";

type ReviewRow = {
  checked: boolean;
  name: string;
  quantity: string;
  unit: string;
  storage: string;
  dateOverride: boolean;
  dateMode: DateMode;
  purchasedDate: string;
  expiryDate: string;
  estimateHint: string | null;
};

function initRows(
  items: ReceiptScanResult["items"],
  receiptPurchasedDate: string,
): ReviewRow[] {
  return items.map((item) => ({
    checked: true,
    name: item.name,
    quantity: String(item.quantity),
    unit: INVENTORY_UNITS.includes(item.unit as (typeof INVENTORY_UNITS)[number])
      ? item.unit
      : "개",
    storage: "냉장",
    dateOverride: false,
    dateMode: "purchase",
    purchasedDate: receiptPurchasedDate,
    expiryDate: "",
    estimateHint: null,
  }));
}

type ReceiptDateState = {
  dateMode: DateMode;
  purchasedDate: string;
  expiryDate: string;
};

type ReceiptScanReviewProps = {
  scanResult: ReceiptScanResult;
  submitting: boolean;
  onConfirm: (items: InventoryItemPayload[]) => Promise<void>;
  onCancel: () => void;
};

export function ReceiptScanReview({
  scanResult,
  submitting,
  onConfirm,
  onCancel,
}: ReceiptScanReviewProps) {
  const receiptDefaultDate = scanResult.purchased_date ?? todayIso();

  const [receiptDate, setReceiptDate] = useState<ReceiptDateState>({
    dateMode: "purchase",
    purchasedDate: receiptDefaultDate,
    expiryDate: "",
  });

  const [rows, setRows] = useState<ReviewRow[]>(() =>
    initRows(scanResult.items, receiptDefaultDate),
  );

  const [showDateBlock, setShowDateBlock] = useState(true);

  const patchReceiptDate = (patch: Partial<ReceiptDateState>) => {
    setReceiptDate((prev) => {
      const next = { ...prev, ...patch };
      setRows((rs) =>
        rs.map((r) =>
          r.dateOverride
            ? r
            : {
                ...r,
                dateMode: next.dateMode,
                purchasedDate: next.purchasedDate,
                expiryDate: next.expiryDate,
              },
        ),
      );
      return next;
    });
  };

  const patchRow = (idx: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const toggleOverride = (idx: number) => {
    const r = rows[idx];
    if (r.dateOverride) {
      patchRow(idx, {
        dateOverride: false,
        dateMode: receiptDate.dateMode,
        purchasedDate: receiptDate.purchasedDate,
        expiryDate: receiptDate.expiryDate,
      });
    } else {
      patchRow(idx, { dateOverride: true });
    }
  };

  useEffect(() => {
    rows.forEach((row, idx) => {
      if (!row.checked || row.dateMode !== "purchase" || !row.name.trim()) return;
      const timer = setTimeout(() => {
        void fetchExpiryEstimate(row.name.trim(), row.purchasedDate, row.storage)
          .then((r) =>
            patchRow(idx, {
              estimateHint: `${r.message}. 예상 유통기한 ${r.estimated_expiry_date}`,
            }),
          )
          .catch(() => patchRow(idx, { estimateHint: null }));
      }, 300);
      return () => clearTimeout(timer);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateHint = useCallback(
    (idx: number, name: string, purchasedDate: string, storage: string, dateMode: DateMode) => {
      if (dateMode !== "purchase" || !name.trim()) {
        patchRow(idx, { estimateHint: null });
        return;
      }
      const timer = setTimeout(() => {
        void fetchExpiryEstimate(name.trim(), purchasedDate, storage)
          .then((r) =>
            patchRow(idx, {
              estimateHint: `${r.message}. 예상 유통기한 ${r.estimated_expiry_date}`,
            }),
          )
          .catch(() => patchRow(idx, { estimateHint: null }));
      }, 300);
      return timer;
    },
    [],
  );

  const checkedCount = rows.filter((r) => r.checked).length;
  const total = rows.length;

  const handleConfirm = async () => {
    const payloads: InventoryItemPayload[] = rows
      .filter((r) => r.checked)
      .map((r) => {
        const qty = parseInt(r.quantity, 10);
        return {
          name: r.name.trim(),
          quantity: Number.isNaN(qty) || qty < 1 ? 1 : qty,
          unit: r.unit,
          storage: r.storage,
          expiry_date: r.dateMode === "expiry" ? r.expiryDate || null : null,
          purchased_date: r.dateMode === "purchase" ? r.purchasedDate : null,
          min_quantity: 1,
        };
      });
    await onConfirm(payloads);
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground">영수증에서 품목을 인식하지 못했습니다.</p>
        <Button variant="outline" onClick={onCancel}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {scanResult.store_name && (
        <p className="text-sm text-muted-foreground">
          가게: <span className="font-medium text-foreground">{scanResult.store_name}</span>
        </p>
      )}

      {/* 영수증 날짜 블록 */}
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium"
          onClick={() => setShowDateBlock((v) => !v)}
        >
          <span>날짜 기본값 (전체 적용)</span>
          {showDateBlock ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showDateBlock && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={receiptDate.dateMode === "purchase" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => patchReceiptDate({ dateMode: "purchase" })}
              >
                구매일만 알아요
              </Button>
              <Button
                type="button"
                variant={receiptDate.dateMode === "expiry" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => patchReceiptDate({ dateMode: "expiry" })}
              >
                유통기한 알아요
              </Button>
            </div>
            {receiptDate.dateMode === "purchase" ? (
              <Input
                type="date"
                value={receiptDate.purchasedDate}
                onChange={(e) => patchReceiptDate({ purchasedDate: e.target.value })}
              />
            ) : (
              <Input
                type="date"
                value={receiptDate.expiryDate}
                onChange={(e) => patchReceiptDate({ expiryDate: e.target.value })}
              />
            )}
            <p className="text-xs text-muted-foreground">
              &quot;날짜 따로&quot; 로 행별 덮어쓰기 가능합니다.
            </p>
          </div>
        )}
      </div>

      {/* 품목 행 */}
      <div className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col gap-3 px-4 py-4 transition-colors",
              !row.checked && "opacity-50",
            )}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => patchRow(idx, { checked: !row.checked })}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  row.checked
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background",
                )}
                aria-label={row.checked ? "선택 해제" : "선택"}
              >
                {row.checked && <Check className="h-3 w-3" />}
              </button>
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">품목</Label>
                  <Input
                    value={row.name}
                    onChange={(e) => {
                      patchRow(idx, { name: e.target.value, estimateHint: null });
                      const timer = updateHint(
                        idx,
                        e.target.value,
                        row.purchasedDate,
                        row.storage,
                        row.dateMode,
                      );
                      if (timer) return () => clearTimeout(timer);
                    }}
                    placeholder="품목명"
                    disabled={!row.checked}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">수량</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(e) =>
                      patchRow(idx, { quantity: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    disabled={!row.checked}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">단위</Label>
                  <Select
                    value={row.unit}
                    onValueChange={(v) => patchRow(idx, { unit: v })}
                    disabled={!row.checked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">보관</Label>
                  <Select
                    value={row.storage}
                    onValueChange={(v) => {
                      patchRow(idx, { storage: v, estimateHint: null });
                      const timer = updateHint(idx, row.name, row.purchasedDate, v, row.dateMode);
                      if (timer) return () => clearTimeout(timer);
                    }}
                    disabled={!row.checked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_STORAGE.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant={row.dateOverride ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    disabled={!row.checked}
                    onClick={() => toggleOverride(idx)}
                  >
                    날짜 따로
                  </Button>
                </div>
              </div>
            </div>

            {row.dateOverride && row.checked && (
              <div className="ml-8 space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={row.dateMode === "purchase" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      patchRow(idx, { dateMode: "purchase" });
                      updateHint(idx, row.name, row.purchasedDate, row.storage, "purchase");
                    }}
                  >
                    구매일만 알아요
                  </Button>
                  <Button
                    type="button"
                    variant={row.dateMode === "expiry" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      patchRow(idx, { dateMode: "expiry", estimateHint: null });
                    }}
                  >
                    유통기한 알아요
                  </Button>
                </div>
                {row.dateMode === "purchase" ? (
                  <Input
                    type="date"
                    value={row.purchasedDate}
                    onChange={(e) => {
                      patchRow(idx, { purchasedDate: e.target.value, estimateHint: null });
                      updateHint(idx, row.name, e.target.value, row.storage, "purchase");
                    }}
                  />
                ) : (
                  <Input
                    type="date"
                    value={row.expiryDate}
                    onChange={(e) => patchRow(idx, { expiryDate: e.target.value })}
                  />
                )}
              </div>
            )}

            {row.estimateHint && row.checked && row.dateMode === "purchase" && (
              <p className="ml-8 text-xs text-muted-foreground">{row.estimateHint}</p>
            )}
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          <X className="mr-1.5 h-4 w-4" />
          취소
        </Button>
        <Button
          type="button"
          disabled={submitting || checkedCount === 0}
          onClick={() => void handleConfirm()}
          className="sm:min-w-[200px]"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {checkedCount}개 재고에 담기
          {checkedCount < total && (
            <span className="ml-1 text-xs opacity-70">/ {total}개 중</span>
          )}
        </Button>
      </div>
    </div>
  );
}
