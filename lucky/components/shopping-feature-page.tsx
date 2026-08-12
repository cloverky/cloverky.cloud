"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChefHat, ExternalLink, Loader2, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomRightExtras } from "@/components/bottom-right-extras-context";
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
import { fetchInventory, type InventoryItem } from "@/lib/inventory-api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const SHOPS = [
  {
    name: "네이버",
    url: (q: string) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q + " 구매")}`,
  },
  {
    name: "쿠팡",
    url: (q: string) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "마켓컬리",
    url: (q: string) => `https://www.kurly.com/search?sword=${encodeURIComponent(q)}`,
  },
] as const;

type MissingIngredient = {
  name: string;
  inFridge: boolean;
  quantity?: string;
};

// 한자(CJK 통합 한자) 범위. 지금 쓰는 모델이 한국어 단어 중간에 중국어 글자를
// 끼워 넣는 일이 있다 — "양파"를 "양葱", "양념장"을 "양념汁" 으로 내놓는 식이다.
// 장보기 목록에 쓸 재료명에 한자가 들어갈 일은 없으므로 오염 신호로 본다.
const HANJA = /[一-鿿]/;

async function requestIngredients(dish: string): Promise<string[]> {
  const prompt = `"${dish}"을(를) 만들기 위한 재료 목록을 JSON 배열로만 출력해줘.
반드시 한국어로만 쓰고 한자나 영어를 섞지 마. 예: ["양파","마늘"]
설명 없이 배열만.`;
  const res = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
  });
  const data = (await res.json()) as { reply?: string; error?: string };
  if (data.error) throw new Error(data.error);
  const raw = data.reply ?? "";
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("재료 목록을 파싱하지 못했습니다.");
  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) throw new Error("재료 목록을 파싱하지 못했습니다.");
  return parsed
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** 큐레이션된 레시피에서 재료를 찾는다. 목록에 없는 음식이면 null. */
async function lookupIngredients(dish: string): Promise<string[] | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/fridge/recipe-ingredients?dish=${encodeURIComponent(dish)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      core?: string[];
      sub?: string[];
    };
    // pantry(소금·후추 같은 기본 양념)는 장보기 목록에서 뺀다 — 보통 집에 있다.
    const names = [...(data.core ?? []), ...(data.sub ?? [])];
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
}

async function fetchIngredients(dish: string): Promise<string[]> {
  // "크림파스타에 뭐가 들어가지" 는 지어낼 문제가 아니라 찾아볼 문제다.
  // 등록된 레시피면 모델을 거치지 않고 정확한 재료를 그대로 쓴다.
  const known = await lookupIngredients(dish);
  if (known) return known;

  let names = await requestIngredients(dish);

  // 결과가 매번 달라서 한 번 더 물어보면 멀쩡한 답이 나오는 경우가 많다.
  if (names.some((n) => HANJA.test(n))) {
    try {
      names = await requestIngredients(dish);
    } catch {
      // 재시도가 실패하면 첫 응답을 그대로 걸러 쓴다.
    }
  }

  // 그래도 한자가 남으면 그 항목은 버린다. "양葱" 처럼 고칠 수 없는 말이
  // 장바구니에 담기는 것보다 하나 빠지는 편이 낫다.
  const clean = names.filter((n) => !HANJA.test(n));
  if (clean.length === 0) throw new Error("재료 목록을 파싱하지 못했습니다.");
  return clean;
}

function ShoppingItemRow({
  item,
  checked,
  onToggle,
  onRemove,
}: {
  item: string;
  checked: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-foreground"
      />
      <span className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
        {item}
      </span>
      <div className="flex shrink-0 gap-1">
        {SHOPS.map((shop) => (
          <a
            key={shop.name}
            href={shop.url(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {shop.name}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ShoppingFeaturePage() {
  const { user, isReady } = useAuth();
  const openLogin = useOpenLogin();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [dish, setDish] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [missing, setMissing] = useState<MissingIngredient[] | null>(null);
  const [analyzedDish, setAnalyzedDish] = useState("");

  const [cartItems, setCartItems] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [newItem, setNewItem] = useState("");

  const loadInventory = useCallback(async () => {
    const email = user?.email;
    if (!email) return;
    setInventoryLoading(true);
    try {
      const data = await fetchInventory(email);
      setInventory(data.items);
    } catch {
      // ignore
    } finally {
      setInventoryLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    // 로그인 사용자가 확인되면 서버에서 재고 목록을 가져온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isReady && user?.email) void loadInventory();
  }, [isReady, user?.email, loadInventory]);

  const handleAnalyze = async () => {
    const d = dish.trim();
    if (!d) return;
    if (!user?.email) { openLogin(); return; }

    setAnalyzing(true);
    setMissing(null);
    setAnalyzedDish(d);
    try {
      const ingredients = await fetchIngredients(d);
      const result: MissingIngredient[] = ingredients.map((name) => {
        const found = inventory.find((inv) =>
          inv.name.includes(name) || name.includes(inv.name)
        );
        return {
          name,
          inFridge: !!found,
          quantity: found?.quantity_label,
        };
      });
      setMissing(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const addToCart = (name: string) => {
    if (cartItems.includes(name)) return;
    setCartItems((prev) => [...prev, name]);
    toast.success(`"${name}" 장바구니에 추가했습니다.`);
  };

  const addAllMissing = () => {
    if (!missing) return;
    const toAdd = missing.filter((m) => !m.inFridge).map((m) => m.name);
    const newOnes = toAdd.filter((n) => !cartItems.includes(n));
    if (!newOnes.length) { toast("이미 모두 담겨 있습니다."); return; }
    setCartItems((prev) => [...prev, ...newOnes]);
    toast.success(`부족한 재료 ${newOnes.length}개를 장바구니에 담았습니다.`);
  };

  const removeFromCart = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
    setChecked((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); });
      return next;
    });
  };

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleAddManual = () => {
    const name = newItem.trim();
    if (!name) return;
    addToCart(name);
    setNewItem("");
  };

  const missingCount = missing?.filter((m) => !m.inFridge).length ?? 0;
  const uncheckedCount = cartItems.filter((_, i) => !checked.has(i)).length;

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
              <ShoppingCart className="h-7 w-7 text-accent" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">쇼핑 연결</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              만들 음식을 입력하면 부족한 재료를 알려드립니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
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
              <CardDescription>로그인하면 냉장고 재고와 비교해 부족한 재료를 찾아드립니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3 pb-8">
              <Button onClick={openLogin}>로그인</Button>
              <Button variant="outline" asChild><Link href="/">홈으로</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 음식 입력 + 재료 분석 */}
            <Card className="mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  어떤 음식 만들 거야?
                </CardTitle>
                <CardDescription>
                  음식 이름을 입력하면 AI가 필요한 재료를 분석하고 냉장고 재고와 비교합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="예: 김치찌개, 된장찌개, 파스타…"
                    value={dish}
                    onChange={(e) => setDish(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAnalyze(); } }}
                    disabled={analyzing}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleAnalyze()}
                    disabled={!dish.trim() || analyzing || inventoryLoading}
                  >
                    {analyzing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    분석
                  </Button>
                </div>

                {missing !== null && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        <span className="text-foreground">{analyzedDish}</span> 재료{" "}
                        {missing.length}개 중{" "}
                        <span className="text-destructive font-semibold">{missingCount}개 부족</span>
                      </p>
                      {missingCount > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={addAllMissing}
                        >
                          부족한 재료 전부 담기
                        </Button>
                      )}
                    </div>
                    <div className="divide-y divide-border rounded-md border">
                      {missing.map((m) => (
                        <div key={m.name} className="flex items-center gap-3 px-4 py-2.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${m.inFridge ? "bg-accent" : "bg-destructive"}`}
                          />
                          <span className="flex-1 text-sm">{m.name}</span>
                          {m.inFridge ? (
                            <span className="text-xs text-muted-foreground">{m.quantity} 보유</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-destructive/40 bg-destructive/10 text-destructive font-normal text-xs"
                            >
                              없음
                            </Badge>
                          )}
                          {!m.inFridge && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => addToCart(m.name)}
                              disabled={cartItems.includes(m.name)}
                            >
                              {cartItems.includes(m.name) ? "담김" : "장바구니 +"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 장바구니 */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  장바구니 메모
                  {uncheckedCount > 0 && (
                    <Badge variant="outline" className="font-normal">
                      {uncheckedCount}개 남음
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  품목 옆 쇼핑몰 버튼을 누르면 검색 결과로 이동합니다. 구매 후 체크하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="직접 추가할 재료 입력"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddManual(); } }}
                  />
                  <Button type="button" onClick={handleAddManual} disabled={!newItem.trim()}>
                    추가
                  </Button>
                </div>
                {cartItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    장바구니가 비어있습니다. 위에서 재료를 추가하거나 직접 입력하세요.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-md border">
                    {cartItems.map((item, i) => (
                      <ShoppingItemRow
                        key={i}
                        item={item}
                        checked={checked.has(i)}
                        onToggle={() => toggleCheck(i)}
                        onRemove={() => removeFromCart(i)}
                      />
                    ))}
                  </div>
                )}
                {cartItems.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => { setCartItems([]); setChecked(new Set()); }}
                    >
                      전체 비우기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Footer />
      <BottomRightExtras />
    </main>
  );
}
