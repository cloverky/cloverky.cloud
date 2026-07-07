"use client";

import { useCallback } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { CloverIcon } from "@/components/clover-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  type ChatMessage,
  nextChatId,
  scrollChatLists,
  useGeminiChat,
} from "@/components/gemini-chat-context";
import { postGeminiChat } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

type GeminiChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 헤더·다이얼로그 공용 전송 로직 (백엔드 POST /chat) */
export function useGeminiSend() {
  const {
    messages,
    setMessages,
    messagesRef,
    input,
    setInput,
    loading,
    setLoading,
    error,
    setError,
    dialogListRef,
    floatingListRef,
  } = useGeminiChat();

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: nextChatId(), role: "user", content: text };
    setInput("");
    setError(null);

    const next = [...messagesRef.current, userMsg];
    messagesRef.current = next;
    setMessages(next);
    setLoading(true);
    scrollChatLists(dialogListRef, floatingListRef);

    try {
      const reply = await postGeminiChat(
        next.map((m) => ({ role: m.role, content: m.content })),
      );
      const withAssistant: ChatMessage[] = [
        ...next,
        { id: nextChatId(), role: "assistant", content: reply },
      ];
      messagesRef.current = withAssistant;
      setMessages(withAssistant);
    } catch (e) {
      let msg = "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      if (e instanceof Error) {
        if (/failed to fetch|networkerror|load failed/i.test(e.message)) {
          msg = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        } else if (/404.*gemini|not found for API/i.test(e.message)) {
          msg =
            "Gemini 모델을 찾을 수 없습니다.\n.env.local 에 GEMINI_MODEL=gemini-2.5-flash 를 설정한 뒤 서버를 재시작해 주세요.";
        } else if (/429|quota|rate.?limit/i.test(e.message)) {
          msg =
            "Gemini API 사용 한도에 도달했습니다.\nGoogle AI Studio에서 할당량·결제를 확인하거나, 잠시 후 다시 시도해 주세요.";
        } else {
          msg = e.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
      scrollChatLists(dialogListRef, floatingListRef);
    }
  }, [
    input,
    loading,
    setInput,
    setError,
    setMessages,
    setLoading,
    messagesRef,
    dialogListRef,
    floatingListRef,
  ]);

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
    dialogListRef,
    floatingListRef,
  };
}

export function GeminiChatDialog({ open, onOpenChange }: GeminiChatDialogProps) {
  const { messages, input, setInput, loading, error, send, dialogListRef } = useGeminiSend();

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[88vh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl",
          "bg-card shadow-[0_28px_56px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]",
        )}
      >
        <DialogHeader className="relative border-b border-border/60 px-6 py-4 text-left">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.14] via-transparent to-transparent"
            aria-hidden
          />
          <DialogTitle className="relative flex items-center gap-3 text-xl font-semibold leading-tight tracking-tight">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <CloverIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            Gemini
          </DialogTitle>
        </DialogHeader>

        <div
          ref={dialogListRef}
          className={cn(
            "flex min-h-[240px] max-h-[min(460px,54vh)] flex-col gap-3 overflow-y-auto bg-muted/10 px-5 py-5",
            "[scrollbar-color:oklch(0.28_0_0)_transparent] [scrollbar-width:thin]",
          )}
        >
          {messages.length === 0 && (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 px-3 py-10 text-center">
              <p className="text-lg font-medium leading-snug text-foreground">무엇을 도와드릴까요?</p>
              <p className="text-pretty text-sm leading-[1.7] text-muted-foreground [word-break:keep-all]">
                레시피·재고 관리 등{" "}
                <span className="whitespace-nowrap">편하게 물어보세요.</span>
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[min(100%,90%)] break-words px-4 py-3 text-[0.9375rem] leading-[1.65] text-foreground whitespace-pre-wrap",
                "shadow-sm [word-break:keep-all]",
                m.role === "user"
                  ? "ml-auto rounded-2xl rounded-br-md bg-secondary/90 ring-1 ring-border/45"
                  : "mr-auto rounded-2xl rounded-bl-md bg-muted/55 ring-1 ring-border/35",
              )}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="mr-auto flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-muted/45 px-4 py-3 text-sm leading-relaxed text-muted-foreground ring-1 ring-border/30">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
              답변을 작성하고 있어요
            </div>
          )}
        </div>

        {error && (
          <p
            className="border-t border-border/40 bg-destructive/5 px-5 py-3 text-center text-sm leading-relaxed break-words text-destructive whitespace-pre-line"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 bg-background/45 p-5 sm:flex-row sm:items-stretch">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력해 주세요"
            disabled={loading}
            rows={3}
            className={cn(
              "min-h-[96px] resize-none rounded-xl border-border/50 bg-muted/25 text-sm leading-relaxed sm:flex-1",
              "placeholder:text-muted-foreground",
              "focus-visible:border-accent/45 focus-visible:ring-accent/20",
            )}
            aria-label="Gemini 메시지 입력"
          />
          <Button
            type="button"
            className={cn(
              "h-11 shrink-0 rounded-xl bg-accent px-8 text-base font-medium text-accent-foreground sm:h-auto sm:self-end",
              "hover:bg-accent/90",
            )}
            disabled={loading || !input.trim()}
            onClick={() => void send()}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <SendHorizontal className="h-4 w-4" strokeWidth={2} />
                전송
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
