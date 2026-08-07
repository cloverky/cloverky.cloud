"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
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
import {
  clearRecipeFeedback,
  fetchRecipeFeedback,
  type RecipeFeedback,
} from "@/lib/recipe-feedback-api";

type State =
  | { kind: "loading" }
  | { kind: "success"; feedback: RecipeFeedback }
  | { kind: "error"; message: string };

function EmptyHint() {
  return (
    <p className="text-sm text-muted-foreground">
      아직 남긴 평가가 없습니다.{" "}
      <Link
        href="/features/recipes"
        className="font-medium text-accent underline-offset-4 hover:underline"
      >
        레시피 추천
      </Link>
      에서 👍 👎 를 눌러 보세요.
    </p>
  );
}

function FeedbackGroup({
  title,
  hint,
  names,
  tone,
  onRemove,
  removing,
}: {
  title: string;
  hint: string;
  names: string[];
  tone: "up" | "down";
  onRemove: (name: string) => void;
  removing: string | null;
}) {
  const Icon = tone === "up" ? ThumbsUp : ThumbsDown;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon
          className={
            tone === "up" ? "h-4 w-4 text-accent" : "h-4 w-4 text-destructive"
          }
        />
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">({names.length})</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {names.length === 0 ? (
        <p className="text-xs text-muted-foreground">아직 없습니다.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name}>
              <Badge
                variant="outline"
                className="gap-1.5 py-1 pl-2.5 pr-1 font-normal"
              >
                {name}
                <button
                  type="button"
                  aria-label={`${name} 평가 지우기`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  disabled={removing === name}
                  onClick={() => onRemove(name)}
                >
                  {removing === name ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 취향 화면에서 지금까지 레시피에 남긴 좋아요·싫어요를 모아 본다. */
export function MyRecipeFeedbackSection() {
  const { user, isReady } = useAuth();
  const openLogin = useOpenLogin();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    setState({ kind: "loading" });
    try {
      setState({ kind: "success", feedback: await fetchRecipeFeedback(user.email) });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "평가를 불러오지 못했습니다.",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, load]);

  const remove = useCallback(
    async (name: string) => {
      if (!user?.email) return;
      setRemoving(name);
      try {
        await clearRecipeFeedback(user.email, name);
        setState((prev) =>
          prev.kind === "success"
            ? {
                ...prev,
                feedback: {
                  liked: prev.feedback.liked.filter((n) => n !== name),
                  disliked: prev.feedback.disliked.filter((n) => n !== name),
                },
              }
            : prev,
        );
        toast.success("평가를 지웠습니다.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "평가를 지우지 못했습니다.");
      } finally {
        setRemoving(null);
      }
    },
    [user],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ThumbsUp className="h-5 w-5 text-accent" />내 레시피 평가
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          레시피 추천에서 남긴 평가입니다. 싫어요를 준 메뉴는 다음 추천부터 빠집니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isReady ? null : !user?.email ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              로그인하면 내가 남긴 평가를 확인할 수 있습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={openLogin}>
              로그인
            </Button>
          </div>
        ) : state.kind === "loading" ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : state.kind === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{state.message}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        ) : state.feedback.liked.length === 0 &&
          state.feedback.disliked.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="space-y-6">
            <FeedbackGroup
              title="좋아요"
              hint="마음에 들었던 레시피입니다."
              names={state.feedback.liked}
              tone="up"
              onRemove={(n) => void remove(n)}
              removing={removing}
            />
            <FeedbackGroup
              title="싫어요"
              hint="추천 목록에서 빠집니다. X 를 누르면 다시 추천받습니다."
              names={state.feedback.disliked}
              tone="down"
              onRemove={(n) => void remove(n)}
              removing={removing}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
