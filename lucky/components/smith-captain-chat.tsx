"use client";

import { useRef, useState } from "react";
import { Loader2, SendHorizontal, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postSmithChat } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

type Message = { id: number; role: "user" | "assistant"; content: string };
let _id = 0;
const nextId = () => ++_id;

const SMITH_PREFIX =
  "당신은 1912년 타이타닉호의 선장 에드워드 존 스미스입니다. " +
  "항해 중 상황처럼 1인칭으로 답변하되, 타이타닉·당시 시대 상황에 맞게 짧고 품위 있게 말해주세요. " +
  "사용자 질문: ";

export function SmithCaptainChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: nextId(), role: "user", content: text };
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    scrollDown();

    try {
      const reply = await postSmithChat(SMITH_PREFIX + text);
      if (reply) {
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: reply }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[480px] flex-col rounded-xl border border-border/60 bg-background overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-accent/5 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Ship className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">스미스 선장</p>
          <p className="text-[10px] text-muted-foreground">Edward J. Smith · 1912</p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 [scrollbar-width:thin] [scrollbar-color:oklch(0.28_0_0)_transparent]"
      >
        {messages.length === 0 && (
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground px-2">
            선장님께 타이타닉에 대해
            <br />
            무엇이든 물어보세요.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] break-words rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-auto rounded-br-md bg-secondary/90 ring-1 ring-border/45"
                : "mr-auto rounded-bl-md bg-muted/55 ring-1 ring-border/35",
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted/45 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/30">
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
            답하고 있습니다…
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <p className="border-t border-border/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive break-words whitespace-pre-line">
          {error}
        </p>
      )}

      {/* 입력 */}
      <div className="border-t border-border/60 bg-background/45 p-3 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="선장님께 질문…"
          disabled={loading}
          rows={2}
          className="flex-1 min-h-[56px] resize-none rounded-xl border-border/50 bg-muted/25 text-xs leading-relaxed placeholder:text-muted-foreground focus-visible:border-accent/45 focus-visible:ring-accent/20"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={loading || !input.trim()}
          onClick={() => void send()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" strokeWidth={2} />
          )}
        </Button>
      </div>
    </div>
  );
}
