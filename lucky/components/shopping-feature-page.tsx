"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, ShoppingCart, Trash2 } from "lucide-react";
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
import { fetchInventory, type InventoryItem } from "@/lib/inventory-api";

const SHOPS = [
  { name: "네이버쇼핑", url: (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}` },
  { name: "쿠팡", url: (q: string) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}` },
  { name: "마켓컬리", url: (q: string) => `https://www.kurly.com/search?sword=${encodeURIComponent(q)}` },
] as const;

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
    <div className="flex items-center gap-3 py-2.5 px-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 accent-foreground shrink-0"
      />
      <span className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
        {item}
      </span>
      <div className="flex gap-1 shrink-0">
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

  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [newItem, setNewItem] = useState("");

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const data = await fetchInventory(user.email);
      setLowStockItems(data.items.filter((i) => i.status === "부족" || i.status === "긴급"));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isReady && user?.email) void load();
  }, [isReady, user?.email, load]);

  const addToCart = (name: string) => {
    if (cartItems.includes(name)) return;
    setCartItems((prev) => [...prev, name]);
    toast.success(`"${name}" 장바구니에 추가했습니다.`);
  };

  const removeFromCart = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAddManual = () => {
    const name = newItem.trim();
    if (!name) return;
    addToCart(name);
    setNewItem("");
  };

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
            <p className="mt-2 text-lg text-muted-foreground">부족한 재료를 바로 주문하세요.</p>
            <Badge variant="outline" className="mt-4 font-normal">도우미: 쇼핑 AI</Badge>
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
              <CardDescription>로그인하면 부족한 재료를 자동으로 감지합니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3 pb-8">
              <Button onClick={openLogin}>로그인</Button>
              <Button variant="outline" asChild><Link href="/">홈으로</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 부족 재료 */}
            <Card className="mt-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  재고 부족 재료
                  {lowStockItems.length > 0 && (
                    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive font-normal">
                      {lowStockItems.length}개
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>재고가 부족하거나 긴급한 식재료입니다. 장바구니에 담아 한 번에 주문하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">부족한 재료가 없습니다.</p>
                ) : (
                  <div className="divide-y divide-border rounded-md border">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.quantity_label}</span>
                        <Badge
                          variant="outline"
                          className={`font-normal text-xs ${item.status === "긴급" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}
                        >
                          {item.status}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => addToCart(item.name)}
                          disabled={cartItems.includes(item.name)}
                        >
                          {cartItems.includes(item.name) ? "담김" : "장바구니 +"}
                        </Button>
                      </div>
                    ))}
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
                    <Badge variant="outline" className="font-normal">{uncheckedCount}개 남음</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  품목명 옆 쇼핑몰 버튼을 누르면 검색 결과로 이동합니다. 구매 후 체크하세요.
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
                  <Button type="button" onClick={handleAddManual} disabled={!newItem.trim()}>추가</Button>
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
      <BottomRightStack />
    </main>
  );
}
