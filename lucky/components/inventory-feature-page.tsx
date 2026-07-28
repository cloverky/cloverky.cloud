"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Minus,
  Package,
  Plus,
  ScanLine,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BottomRightStack } from "@/components/bottom-right-stack";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import { useOpenLogin } from "@/components/login-dialog-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FEATURE_PAGES } from "@/lib/feature-pages";
import {
  INVENTORY_STORAGE,
  INVENTORY_UNITS,
  addInventoryQuantity,
  consumeInventoryItem,
  createInventoryItem,
  deleteInventoryItem,
  fetchExpiryEstimate,
  fetchInventory,
  quantityStep,
  isPackCountFood,
  suggestUnitForName,
  unitForPackStyle,
  scanReceipt,
  type InventoryItem,
  type InventoryStats,
  type PackCountStyle,
  type ReceiptScanResult,
} from "@/lib/inventory-api";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: string) {
  if (status === "임박" || status === "긴급") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (status === "부족") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "border-accent/30 bg-accent/10 text-accent";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatExpiry(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `만료`;
  if (diff === 0) return "D-day";
  return `D-${diff}`;
}

type InventoryPageState = {
  items: InventoryItem[];
  stats: InventoryStats | null;
  loading: boolean;
  submitting: boolean;
  adjustingId: number | null;
  error: string | null;
};

type AddMode = "manual" | "receipt";

type InventoryAddFormState = {
  addMode: AddMode;
  name: string;
  quantity: string;
  unit: string;
  packStyle: PackCountStyle;
  showAllUnits: boolean;
  storage: string;
  dateMode: "expiry" | "purchase";
  expiryDate: string;
  purchasedDate: string;
  estimateHint: string | null;
};

const INITIAL_PAGE: InventoryPageState = {
  items: [],
  stats: null,
  loading: false,
  submitting: false,
  adjustingId: null,
  error: null,
};

function createInitialAddForm(): InventoryAddFormState {
  return {
    addMode: "manual",
    name: "",
    quantity: "1",
    unit: "개",
    packStyle: "piece",
    showAllUnits: false,
    storage: "냉장",
    dateMode: "purchase",
    expiryDate: "",
    purchasedDate: todayIso(),
    estimateHint: null,
  };
}

export function InventoryFeaturePage() {
  const config = FEATURE_PAGES.inventory;
  const { user, isReady } = useAuth();
  const openLogin = useOpenLogin();

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptResult, setReceiptResult] = useState<ReceiptScanResult | null>(null);
  const [receiptSelected, setReceiptSelected] = useState<Set<number>>(new Set());
  const [receiptAdding, setReceiptAdding] = useState(false);

    const [page, setPage] = useState<InventoryPageState>(INITIAL_PAGE);
  const [form, setForm] = useState<InventoryAddFormState>(createInitialAddForm);

  const patchPage = useCallback(
    (patch: Partial<InventoryPageState>) => setPage((prev) => ({ ...prev, ...patch })),
    [],
  );
  const patchForm = useCallback(
    (patch: Partial<InventoryAddFormState>) => setForm((prev) => ({ ...prev, ...patch })),
    [],
  );
  const resetAddForm = () => setForm(createInitialAddForm());

  const { items, stats, loading, submitting, adjustingId, error } = page;
  const {
    addMode,
    name,
    quantity,
    unit,
    packStyle,
    showAllUnits,
    storage,
    dateMode,
    expiryDate,
    purchasedDate,
    estimateHint,
  } = form;

  const load = useCallback(async () => {
    const email = user?.email;
    if (!email) return;
    patchPage({ loading: true, error: null });
    try {
      const data = await fetchInventory(email);
      patchPage({ items: data.items, stats: data.stats });
    } catch (e) {
      patchPage({
        error: e instanceof Error ? e.message : "목록을 불러오지 못했습니다.",
      });
    } finally {
      patchPage({ loading: false });
    }
  }, [user?.email, patchPage]);

  useEffect(() => {
    if (isReady && user?.email) {
      // 로그인 사용자가 확인되면 서버에서 재고 목록을 가져온다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [isReady, user?.email, load]);

  const packCountMode = isPackCountFood(name) && !suggestUnitForName(name);

  useEffect(() => {
    const meatUnit = suggestUnitForName(name);
    if (meatUnit) {
      // 식재료 이름이 바뀔 때마다 추천 단위로 폼을 자동 조정한다(사용자가 이후 직접 변경 가능).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      patchForm({ unit: meatUnit, showAllUnits: false });
      return;
    }
    if (isPackCountFood(name)) {
      if (!showAllUnits) {
        patchForm({ unit: unitForPackStyle(packStyle) });
      }
    } else {
      patchForm({ showAllUnits: false });
    }
  }, [name, packStyle, showAllUnits, patchForm]);

  useEffect(() => {
    if (dateMode !== "purchase" || !name.trim()) {
      // 유통기한 추정 조건을 벗어나면 이전에 표시하던 힌트를 지운다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      patchForm({ estimateHint: null });
      return;
    }
    const timer = setTimeout(() => {
      void fetchExpiryEstimate(name.trim(), purchasedDate, storage)
        .then((r) =>
          patchForm({
            estimateHint: `${r.message}. 예상 유통기한은 ${r.estimated_expiry_date} 입니다.`,
          }),
        )
        .catch(() => patchForm({ estimateHint: null }));
    }, 400);
    return () => clearTimeout(timer);
  }, [dateMode, name, purchasedDate, storage, patchForm]);

  const handleScanReceipt = async (file: File) => {
    setReceiptFile(file);
    setReceiptResult(null);
    setReceiptSelected(new Set());
    setReceiptScanning(true);
    try {
      const result = await scanReceipt(file);
      setReceiptResult(result);
      setReceiptSelected(new Set(result.items.map((_, i) => i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "영수증 인식에 실패했습니다.");
    } finally {
      setReceiptScanning(false);
    }
  };

  const handleAddFromReceipt = async () => {
    if (!user?.email || !receiptResult) return;
    const purchasedDate = receiptResult.purchased_date ?? todayIso();
    const toAdd = receiptResult.items.filter((_, i) => receiptSelected.has(i));
    if (toAdd.length === 0) {
      toast.error("추가할 품목을 선택해 주세요.");
      return;
    }
    setReceiptAdding(true);
    let added = 0;
    for (const item of toAdd) {
      try {
        await createInventoryItem(user.email, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          storage: "냉장",
          purchased_date: purchasedDate,
          expiry_date: null,
          min_quantity: 1,
        });
        added++;
      } catch {
        // continue
      }
    }
    setReceiptAdding(false);
    toast.success(`${added}개 품목을 냉장고에 추가했습니다.`);
    setReceiptResult(null);
    setReceiptFile(null);
    patchForm({ addMode: "manual" });
    await load();
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) {
      openLogin();
      return;
    }

    const formData = new FormData(e.currentTarget);
    const formProps = Object.fromEntries(formData.entries()) as Record<string, string>;

    const itemName = String(formProps.name ?? "").trim();
    const q = parseInt(String(formProps.quantity ?? ""), 10);
    const itemUnit = String(formProps.unit ?? "개");
    const itemStorage = String(formProps.storage ?? "냉장");
    const itemDateMode = formProps.dateMode === "expiry" ? "expiry" : "purchase";
    const itemExpiry = String(formProps.expiryDate ?? "");
    const itemPurchased = String(formProps.purchasedDate ?? "");

    patchForm({
      name: itemName,
      quantity: String(formProps.quantity ?? ""),
      unit: itemUnit,
      storage: itemStorage,
      dateMode: itemDateMode,
      expiryDate: itemExpiry,
      purchasedDate: itemPurchased,
    });

    if (!itemName || Number.isNaN(q) || q < 1) {
      toast.error("품목명과 수량(1 이상 정수)을 확인해 주세요.");
      return;
    }

    patchPage({ submitting: true });
    try {
      await createInventoryItem(user.email, {
        name: itemName,
        quantity: q,
        unit: itemUnit,
        storage: itemStorage,
        expiry_date: itemDateMode === "expiry" ? itemExpiry || null : null,
        purchased_date: itemDateMode === "purchase" ? itemPurchased : null,
        min_quantity: 1,
      });
      toast.success(
        itemDateMode === "purchase"
          ? "식재료를 등록했습니다. 유통기한은 구매일 기준으로 추정했습니다."
          : "식재료를 등록했습니다.",
      );
      resetAddForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      patchPage({ submitting: false });
    }
  };

  const handleDelete = async (id: number) => {
    if (!user?.email) return;
    try {
      await deleteInventoryItem(user.email, id);
      toast.success("삭제했습니다.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  const handleConsume = async (item: InventoryItem) => {
    if (!user?.email) return;
    const step = quantityStep(item.unit);
    patchPage({ adjustingId: item.id });
    try {
      const res = await consumeInventoryItem(user.email, item.id, step);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수량 변경에 실패했습니다.");
    } finally {
      patchPage({ adjustingId: null });
    }
  };

  const handleAddOne = async (item: InventoryItem) => {
    if (!user?.email) return;
    const step = quantityStep(item.unit);
    patchPage({ adjustingId: item.id });
    try {
      const res = await addInventoryQuantity(user.email, item.id, step);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수량 변경에 실패했습니다.");
    } finally {
      patchPage({ adjustingId: null });
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute top-0 right-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-accent/15 blur-[100px]" />

      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-16">
        <Link
          href="/#features"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          주요 기능으로
        </Link>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
              <Package className="h-7 w-7 text-accent" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              {config.title}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{config.subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {config.tagline}
            </p>
            {user ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{user.username}</span>
                님의 나만의냉장고에 저장됩니다
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        </div>

        {!isReady ? (
          <div className="mt-16 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <Card className="mt-12 border-dashed">
            <CardHeader className="text-center">
              <CardTitle>로그인이 필요합니다</CardTitle>
              <CardDescription>
                회원가입·로그인 후 내 냉장고 식재료를 나만의냉장고에 저장하고 관리할 수
                있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3 pb-8">
              <Button onClick={openLogin}>로그인</Button>
              <Button variant="outline" asChild>
                <Link href="/">홈으로</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>등록 품목</CardDescription>
                  <CardTitle className="text-2xl">
                    {loading ? "…" : (stats?.total ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  내 계정 데이터
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>유통기한 임박</CardDescription>
                  <CardTitle className="text-2xl">
                    {loading ? "…" : (stats?.expiring_soon ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  3일 이내
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>재고 부족</CardDescription>
                  <CardTitle className="text-2xl">
                    {loading ? "…" : (stats?.low_stock ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  기준 이하
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {config.highlights.map((h) => (
                <Card key={h.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{h.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {h.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Card className="mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  식재료 추가
                </CardTitle>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant={addMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => patchForm({ addMode: "manual" })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    직접 입력
                  </Button>
                  <Button
                    type="button"
                    variant={addMode === "receipt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => patchForm({ addMode: "receipt" })}
                  >
                    <Camera className="mr-1.5 h-4 w-4" />
                    영수증 스캔
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {addMode === "receipt" ? (
                  <div className="space-y-4">
                    <label
                      htmlFor="receipt-upload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      {receiptScanning ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="text-sm">영수증 인식 중…</span>
                        </>
                      ) : receiptFile ? (
                        <>
                          <ScanLine className="h-8 w-8" />
                          <span className="text-sm font-medium">{receiptFile.name}</span>
                          <span className="text-xs">다른 파일을 선택하려면 클릭</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8" />
                          <span className="text-sm font-medium">영수증 사진 선택 또는 촬영</span>
                          <span className="text-xs">JPG · PNG · WEBP 지원</span>
                        </>
                      )}
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleScanReceipt(file);
                      }}
                    />
                    {receiptResult && (
                      <div className="space-y-3">
                        {receiptResult.store_name && (
                          <p className="text-sm text-muted-foreground">
                            매장: <span className="font-medium text-foreground">{receiptResult.store_name}</span>
                            {receiptResult.purchased_date && (
                              <> · 구매일: <span className="font-medium text-foreground">{receiptResult.purchased_date}</span></>
                            )}
                          </p>
                        )}
                        <p className="text-sm font-medium">인식된 품목 ({receiptResult.items.length}개)</p>
                        <div className="divide-y divide-border rounded-md border">
                          {receiptResult.items.map((item, i) => (
                            <label key={i} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                              <input
                                type="checkbox"
                                checked={receiptSelected.has(i)}
                                onChange={(e) => {
                                  const next = new Set(receiptSelected);
                                  if (e.target.checked) next.add(i); else next.delete(i);
                                  setReceiptSelected(next);
                                }}
                                className="h-4 w-4 accent-foreground"
                              />
                              <span className="flex-1 text-sm">{item.name}</span>
                              <span className="text-sm text-muted-foreground">{item.quantity}{item.unit}</span>
                            </label>
                          ))}
                        </div>
                        <Button
                          type="button"
                          disabled={receiptAdding || receiptSelected.size === 0}
                          onClick={() => void handleAddFromReceipt()}
                          className="w-full"
                        >
                          {receiptAdding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          선택한 {receiptSelected.size}개 냉장고에 추가
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                <form
                  onSubmit={(e) => void handleAdd(e)}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <input type="hidden" name="unit" value={unit} />
                  <input type="hidden" name="storage" value={storage} />
                  <input type="hidden" name="dateMode" value={dateMode} />
                  <input type="hidden" name="expiryDate" value={expiryDate} />
                  <input type="hidden" name="purchasedDate" value={purchasedDate} />
                  <div className="space-y-2">
                    <Label htmlFor="inv-name">품목</Label>
                    <Input
                      id="inv-name"
                      name="name"
                      value={name}
                      onChange={(e) => patchForm({ name: e.target.value })}
                      placeholder="예: 우유"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-qty">수량</Label>
                    <Input
                      id="inv-qty"
                      name="quantity"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) =>
                        patchForm({ quantity: e.target.value.replace(/[^0-9]/g, "") })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>단위</Label>
                    {packCountMode && !showAllUnits ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={packStyle === "piece" ? "default" : "outline"}
                          size="sm"
                          className="h-9 flex-1"
                          onClick={() => patchForm({ packStyle: "piece", unit: "개" })}
                        >
                          낱개
                        </Button>
                        <Button
                          type="button"
                          variant={packStyle === "bag" ? "default" : "outline"}
                          size="sm"
                          className="h-9 flex-1"
                          onClick={() => patchForm({ packStyle: "bag", unit: "봉" })}
                        >
                          봉지
                        </Button>
                      </div>
                    ) : (
                      <Select value={unit} onValueChange={(v) => patchForm({ unit: v })}>
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
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>날짜</Label>
                    <div className="flex flex-col gap-1.5 sm:flex-row">
                      <Button
                        type="button"
                        variant={dateMode === "purchase" ? "default" : "outline"}
                        size="sm"
                        className="h-9 flex-1 text-xs sm:text-sm"
                        onClick={() => patchForm({ dateMode: "purchase" })}
                      >
                        구매일만 알아요
                      </Button>
                      <Button
                        type="button"
                        variant={dateMode === "expiry" ? "default" : "outline"}
                        size="sm"
                        className="h-9 flex-1 text-xs sm:text-sm"
                        onClick={() => patchForm({ dateMode: "expiry" })}
                      >
                        유통기한 알아요
                      </Button>
                    </div>
                    {dateMode === "purchase" ? (
                      <>
                        <Label htmlFor="inv-purchased" className="sr-only">
                          구매일
                        </Label>
                        <Input
                          id="inv-purchased"
                          type="date"
                          value={purchasedDate}
                          onChange={(e) => patchForm({ purchasedDate: e.target.value })}
                          required
                        />
                        {estimateHint ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {estimateHint}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            품목·보관 기준으로 유통기한을 추정합니다.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <Label htmlFor="inv-expiry" className="sr-only">
                          유통기한
                        </Label>
                        <Input
                          id="inv-expiry"
                          type="date"
                          value={expiryDate}
                          onChange={(e) => patchForm({ expiryDate: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>보관</Label>
                    <Select value={storage} onValueChange={(v) => patchForm({ storage: v })}>
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
                  <div className="flex items-end">
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      추가하기
                    </Button>
                  </div>
                </form>
                )}
              </CardContent>
            </Card>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>식재료 목록</CardTitle>
                <CardDescription>
                  {user.username}님 계정에 저장된 재고입니다. 계란처럼 하나씩 드실 때는
                  수량 옆 <span className="font-medium text-foreground">－</span> 버튼을
                  누르세요. 다 먹으면 자동으로 목록에서 빠집니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {error ? (
                  <p className="mb-4 text-sm text-destructive">{error}</p>
                ) : null}
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    등록된 식재료가 없습니다. 위에서 추가해 보세요.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>품목</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>유통기한</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="w-[7rem]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <span>{item.name}</span>
                            {item.storage !== "냉장" && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] font-normal">
                                {item.storage}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                disabled={adjustingId === item.id}
                                onClick={() => void handleConsume(item)}
                                aria-label={`${item.name} ${quantityStep(item.unit)}${item.unit} 사용`}
                                title={`${quantityStep(item.unit)}${item.unit} 사용`}
                              >
                                {adjustingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
                                {item.quantity_label}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                disabled={adjustingId === item.id}
                                onClick={() => void handleAddOne(item)}
                                aria-label={`${item.name} ${quantityStep(item.unit)}${item.unit} 추가`}
                                title={`${quantityStep(item.unit)}${item.unit} 추가`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums">
                              {formatExpiry(item.expiry_date)}
                            </span>
                            {item.expiry_is_estimated ? (
                              <Badge
                                variant="outline"
                                className="ml-1.5 text-[10px] font-normal text-muted-foreground"
                              >
                                추정
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                statusBadgeClass(item.status),
                              )}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => void handleDelete(item.id)}
                              aria-label={`${item.name} 삭제`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Footer />
      <BottomRightStack />
    </main>
  );
}
