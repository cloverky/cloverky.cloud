"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChefHat, Clock, Loader2, RefreshCw, ThumbsDown, ThumbsUp, Utensils, Sunrise, Sun, Moon } from "lucide-react";
import { CloverIcon } from "@/components/clover-icon";
import { BottomRightExtras } from "@/components/bottom-right-extras-context";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchInventory } from "@/lib/inventory-api";
import {
  fetchRecipeFeedback,
  putRecipeFeedback,
  type Verdict,
} from "@/lib/recipe-feedback-api";
import { cn } from "@/lib/utils";
import type { RecipeSummary, RecipeDetail, MealSuggestion } from "@/app/api/gemini/recipes/route";

function difficultyClass(difficulty: string) {
  if (difficulty === "어려움") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (difficulty === "보통") return "border-amber-500/40 bg-amber-500/10 text-amber-600";
  return "border-accent/30 bg-accent/10 text-accent";
}

type Mode = "fridge" | "meal";

/** 레시피 한 줄에 붙는 좋아요·싫어요. 같은 버튼을 다시 누르면 취소된다. */
function RecipeVote({
  verdict,
  onRate,
}: {
  verdict?: Verdict;
  onRate: (verdict: Verdict) => void;
}) {
  return (
    <span
      className="inline-flex gap-1"
      // 행 클릭은 레시피 상세를 여는 동작이라 여기서 멈춘다.
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="이 레시피 좋아요"
        aria-pressed={verdict === "up"}
        className={cn(
          "h-8 px-2 text-muted-foreground hover:text-accent",
          verdict === "up" && "text-accent",
        )}
        onClick={() => onRate("up")}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="이 레시피 싫어요 — 추천에서 제외"
        aria-pressed={verdict === "down"}
        className={cn(
          "h-8 px-2 text-muted-foreground hover:text-destructive",
          verdict === "down" && "text-destructive",
        )}
        onClick={() => onRate("down")}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </span>
  );
}

function currentMeal(): "아침" | "점심" | "저녁" {
  const h = new Date().getHours();
  if (h < 11) return "아침";
  if (h < 17) return "점심";
  return "저녁";
}

const MEAL_META = {
  아침: {
    parts: [{ big: "오", small: "(늘)" }, { big: "아", small: "(침)" }, { big: "뭐", small: "(먹지)" }, { big: "?", small: "" }],
    icon: Sunrise,
    color: "text-amber-500",
  },
  점심: {
    parts: [{ big: "오", small: "(늘)" }, { big: "점", small: "(심)" }, { big: "뭐", small: "(먹지)" }, { big: "?", small: "" }],
    icon: Sun,
    color: "text-orange-500",
  },
  저녁: {
    parts: [{ big: "오", small: "(늘)" }, { big: "저", small: "(녁)" }, { big: "뭐", small: "(먹지)" }, { big: "?", small: "" }],
    icon: Moon,
    color: "text-indigo-500",
  },
} as const;

export function RecipeFeaturePage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("fridge");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [meals, setMeals] = useState<MealSuggestion[]>([]);
  const [activeMeal] = useState<"아침" | "점심" | "저녁">(currentMeal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 레시피 이름 → 평가. 싫어요를 준 레시피는 목록에서 빠진다.
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});

  const [selectedRecipe, setSelectedRecipe] = useState<{ name: string } | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRecipes = useCallback(async (ingredientList: string[]) => {
    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const res = await fetch("/api/gemini/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "list", ingredients: ingredientList }),
      });
      const data = (await res.json()) as { recipes?: RecipeSummary[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "레시피 로드 실패");
      setRecipes(data.recipes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeals = useCallback(async (ingredientList: string[]) => {
    setLoading(true);
    setError(null);
    setMeals([]);
    try {
      const res = await fetch("/api/gemini/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "meal", ingredients: ingredientList }),
      });
      const data = (await res.json()) as { meals?: MealSuggestion[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "식사 추천 실패");
      setMeals(data.meals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let ingredientList: string[] = [];

      if (user?.email) {
        try {
          const inv = await fetchInventory(user.email);
          ingredientList = inv.items.map((i) => i.name);
        } catch {
          // 백엔드 연결 실패 → suggest 모드
        }
      } else {
        // 비로그인 → 데모 재료
        ingredientList = ["달걀", "우유", "양파", "밥", "상추"];
      }

      setIngredients(ingredientList);

      if (ingredientList.length === 0) {
        setMode("meal");
        await fetchMeals([]);
      } else {
        setMode("fridge");
        await fetchRecipes(ingredientList);
      }
    };
    void load();
  }, [user, fetchRecipes, fetchMeals]);

  // 지금까지 남긴 평가를 불러온다. 실패해도 추천 자체는 보여 준다.
  useEffect(() => {
    if (!user?.email) return;
    void fetchRecipeFeedback(user.email)
      .then((f) => {
        const next: Record<string, Verdict> = {};
        f.liked.forEach((n) => (next[n] = "up"));
        f.disliked.forEach((n) => (next[n] = "down"));
        setVerdicts(next);
      })
      .catch(() => undefined);
  }, [user]);

  const rate = useCallback(
    async (recipeName: string, verdict: Verdict) => {
      if (!user?.email) return;
      // 응답을 기다리지 않고 먼저 반영한다 — 실패하면 되돌린다.
      const before = verdicts[recipeName];
      setVerdicts((prev) => {
        const next = { ...prev };
        if (before === verdict) delete next[recipeName];
        else next[recipeName] = verdict;
        return next;
      });
      try {
        await putRecipeFeedback(user.email, recipeName, verdict);
      } catch {
        setVerdicts((prev) => {
          const next = { ...prev };
          if (before) next[recipeName] = before;
          else delete next[recipeName];
          return next;
        });
      }
    },
    [user, verdicts],
  );

  const openDetail = async (name: string) => {
    setSelectedRecipe({ name });
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch("/api/gemini/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "detail", recipeName: name, ingredients }),
      });
      const data = (await res.json()) as { detail?: RecipeDetail; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "상세 로드 실패");
      setDetail(data.detail ?? null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRefresh = () => {
    if (mode === "meal") void fetchMeals(ingredients);
    else void fetchRecipes(ingredients);
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
              <ChefHat className="h-7 w-7 text-accent" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              {mode === "meal" ? "오늘 뭐 먹지?" : "맞춤형 레시피 추천"}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {mode === "meal"
                ? `냉장고가 비었네요. ${currentMeal()} 메뉴를 AI가 추천해 드릴게요.`
                : "지금 있는 재료로 무엇을 만들지 AI가 골라줍니다."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              다시 추천받기
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        </div>

        {mode === "fridge" && ingredients.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.email ? `내 냉장고 재료 ${ingredients.length}개 기준:` : "데모 재료 기준:"}
            </span>
            {ingredients.slice(0, 10).map((ing) => (
              <Badge key={ing} variant="outline" className="font-normal text-xs">{ing}</Badge>
            ))}
            {ingredients.length > 10 && (
              <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
                +{ingredients.length - 10}개
              </Badge>
            )}
          </div>
        )}

        <div className="mt-10">
          {/* 냉장고 기반 레시피 */}
          {mode === "fridge" && (
            <Card>
              <CardHeader>
                <CardTitle>추천 레시피</CardTitle>
                <CardDescription>레시피를 클릭하면 상세 조리법을 볼 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    <p className="text-sm">AI가 냉장고 뒤지는 중… 🧑‍🍳</p>
                  </div>
                )}
                {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
                {!loading && !error && recipes.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>레시피</TableHead>
                        <TableHead>시간</TableHead>
                        <TableHead>난이도</TableHead>
                        <TableHead>사용 재료</TableHead>
                        {user?.email ? (
                          <TableHead className="text-right">평가</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* 싫어요를 준 레시피는 다시 보여 주지 않는다. */}
                      {recipes
                        .filter((recipe) => verdicts[recipe.name] !== "down")
                        .map((recipe) => (
                        <TableRow
                          key={recipe.name}
                          className="cursor-pointer hover:bg-accent/5"
                          onClick={() => void openDetail(recipe.name)}
                        >
                          <TableCell className="font-medium text-accent">{recipe.name}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />{recipe.time}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-normal text-xs ${difficultyClass(recipe.difficulty)}`}>
                              {recipe.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{recipe.ingredients}</TableCell>
                          {user?.email ? (
                            <TableCell className="text-right">
                              <RecipeVote
                                verdict={verdicts[recipe.name]}
                                onRate={(v) => void rate(recipe.name, v)}
                              />
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* 빈 냉장고 → 현재 시간대 자동 메뉴 추천 */}
          {mode === "meal" && (() => {
            const meta = MEAL_META[activeMeal];
            const Icon = meta.icon;
            const mealData = meals.find((m) => m.meal === activeMeal);
            return (
              <div className="space-y-6">
                {/* 타이틀 */}
                <div className="flex items-center gap-3">
                  <Icon className={`h-7 w-7 ${meta.color}`} />
                  <h2 className="flex items-end gap-0 text-5xl font-black tracking-tight leading-none">
                    {meta.parts.map((part, i) => (
                      <span key={i} className="inline-flex items-end">
                        <span className="leading-none">{part.big}</span>
                        {part.small && (
                          <span className="text-[0.25em] font-normal text-muted-foreground leading-none mb-1">
                            {part.small}
                          </span>
                        )}
                      </span>
                    ))}
                  </h2>
                </div>

                {loading && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      <p className="text-sm">AI가 오늘 {activeMeal} 고민 중… 🤔</p>
                    </CardContent>
                  </Card>
                )}
                {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
                {!loading && !error && mealData && (
                  <div className="space-y-3">
                    {/* 싫어요를 준 메뉴는 다시 권하지 않는다. */}
                    {mealData.recipes
                      .filter((r) => verdicts[r.name] !== "down")
                      .map((r) => (
                      <Card
                        key={r.name}
                        className="cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-accent/30"
                        onClick={() => void openDetail(r.name)}
                      >
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base text-accent">{r.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-normal text-xs">
                                <Clock className="mr-1 h-3 w-3" />{r.time}
                              </Badge>
                              <Badge variant="outline" className={`font-normal text-xs ${difficultyClass(r.difficulty)}`}>
                                {r.difficulty}
                              </Badge>
                              {user?.email ? (
                                <RecipeVote
                                  verdict={verdicts[r.name]}
                                  onRate={(v) => void rate(r.name, v)}
                                />
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                    <p className="text-center text-xs text-muted-foreground pt-1">
                      클릭하면 상세 레시피를 볼 수 있어요.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      <Footer />
      <BottomRightExtras />

      <Dialog open={!!selectedRecipe} onOpenChange={(o) => { if (!o) setSelectedRecipe(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-accent" />
              {selectedRecipe?.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              선택한 레시피의 재료와 조리 순서를 보여줍니다.
            </DialogDescription>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              상세 레시피 불러오는 중…
            </div>
          )}

          {detail && !detailLoading && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{detail.time}</Badge>
                <Badge variant="outline" className={difficultyClass(detail.difficulty)}>{detail.difficulty}</Badge>
                <Badge variant="outline">{detail.servings}</Badge>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">재료</h3>
                <ul className="space-y-1.5">
                  {detail.ingredients.map((ing, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span>{ing.name}</span>
                      <span className="text-muted-foreground">{ing.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">조리 순서</h3>
                <ol className="space-y-3">
                  {detail.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {detail.tips && (
                <div className="rounded-lg bg-accent/5 p-4 text-sm text-muted-foreground">
                  <CloverIcon className="mb-1 h-4 w-4 text-accent" strokeWidth={2} />
                  {detail.tips}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
