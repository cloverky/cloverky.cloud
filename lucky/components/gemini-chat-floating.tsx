"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { CloverIcon } from "@/components/clover-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGeminiSend } from "@/components/gemini-chat-dialog";
import { cn } from "@/lib/utils";

export function GeminiFloatingChat() {
  const { messages, input, setInput, loading, error, send, floatingListRef } = useGeminiSend();

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full flex-col overflow-hidden rounded-[1.25rem]",
        "border border-border/70 bg-card/80 shadow-[0_22px_44px_-16px_rgba(0,0,0,0.75)] backdrop-blur-2xl",
        "ring-1 ring-inset ring-white/[0.06]",
      )}
      aria-label="Gemini 채팅 창"
    >
      <div className="relative border-b border-border/50 px-4 py-3.5">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.12] via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/20">
            <CloverIcon className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">Gemini</p>
            <p className="mt-0.5 truncate text-sm leading-relaxed text-muted-foreground">
              FridgeAI 안내·질문
            </p>
          </div>
        </div>
      </div>

      <div
        ref={floatingListRef}
        className={cn(
          "flex max-h-[min(220px,32vh)] min-h-[120px] flex-col gap-3 overflow-y-auto px-4 py-3.5",
        "sm:max-h-[min(260px,38vh)] sm:min-h-[140px]",
          "[scrollbar-color:oklch(0.28_0_0)_transparent] [scrollbar-width:thin]",
        )}
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-6 text-center">
            <p className="text-base font-medium leading-snug text-foreground">무엇을 도와드릴까요?</p>
            <p className="text-pretty text-sm leading-[1.7] text-muted-foreground [word-break:keep-all]">
              서비스 이용 방법, 레시피, 재고 관리 등
              <br />
              <span className="whitespace-nowrap">편하게 물어보세요.</span>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[94%] break-words px-3.5 py-2.5 text-sm leading-[1.65] text-foreground whitespace-pre-wrap",
              "shadow-sm [word-break:keep-all]",
              m.role === "user"
                ? "ml-auto rounded-2xl rounded-br-md bg-secondary/90 ring-1 ring-border/40"
                : "mr-auto rounded-2xl rounded-bl-md bg-muted/60 ring-1 ring-border/35",
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-muted/45 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground ring-1 ring-border/25">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
            답변을 작성하고 있어요
          </div>
        )}
      </div>

      {error && (
        <p
          className="border-t border-border/40 bg-destructive/5 px-4 py-3 text-center text-sm leading-relaxed break-words text-destructive whitespace-pre-line"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="border-t border-border/50 bg-background/55 p-4">
        <div className="flex gap-2.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력해 주세요"
            disabled={loading}
            rows={2}
            className={cn(
              "min-h-[56px] flex-1 resize-none rounded-xl border-border/50 bg-muted/30 text-sm leading-relaxed",
              "placeholder:text-muted-foreground",
              "focus-visible:border-accent/45 focus-visible:ring-accent/25",
            )}
            aria-label="채팅 메시지 입력"
          />
          <Button
            type="button"
            size="icon"
            className={cn(
              "h-[56px] w-12 shrink-0 rounded-xl bg-accent text-accent-foreground",
              "hover:bg-accent/90 disabled:opacity-40",
            )}
            disabled={loading || !input.trim()}
            onClick={() => void send()}
            aria-label="메시지 전송"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" strokeWidth={2} />
            )}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
          Enter: 전송 · Shift+Enter: 줄 바꿈
        </p>
      </div>
    </div>
  );
}
