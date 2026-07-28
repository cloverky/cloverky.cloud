"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendTelegram } from "@/lib/telegram-api";

const CHAT_ID_KEY = "cloverky:telegram_chat_id";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function TelegramComposeDialog({ open, onOpenChange }: Props) {
  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // chat_id localStorage 복원
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(CHAT_ID_KEY) ?? "";
      // localStorage는 SSR에서 접근 불가 — 다이얼로그가 열릴 때 복원한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChatId(saved);
    }
  }, [open]);

  const canSend = chatId.trim() && text.trim() && !loading;

  async function handleSend() {
    if (!canSend) return;
    localStorage.setItem(CHAT_ID_KEY, chatId.trim());
    setLoading(true);
    setError(null);
    try {
      await sendTelegram({ chat_id: chatId.trim(), text: text.trim() });
      setSent(true);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSent(false);
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-lg",
          "bg-card shadow-[0_28px_56px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]",
        )}
      >
        <DialogHeader className="relative border-b border-border/60 px-6 py-4 text-left">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#229ED9]/10 via-transparent to-transparent"
            aria-hidden
          />
          <DialogTitle className="relative flex items-center gap-3 text-xl font-semibold leading-tight tracking-tight">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9] ring-1 ring-[#229ED9]/25">
              <TelegramIcon className="h-5 w-5" />
            </span>
            텔레그램 메시지 전송
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#229ED9]/15 text-[#229ED9]">
              <TelegramIcon className="h-6 w-6" />
            </span>
            <p className="text-base font-medium text-foreground">전송 완료!</p>
            <p className="text-sm text-muted-foreground">텔레그램 메시지를 보냈어요.</p>
            <Button variant="outline" className="mt-2" onClick={() => setSent(false)}>
              새 메시지 작성
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="tg-chat-id">
                Chat ID
              </label>
              <Input
                id="tg-chat-id"
                placeholder="123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                disabled={loading}
                className="border-border/50 bg-muted/25 focus-visible:border-[#229ED9]/45 focus-visible:ring-[#229ED9]/20"
              />
              <p className="text-xs text-muted-foreground">
                텔레그램에서 @userinfobot 에게 /start 를 보내면 Chat ID를 확인할 수 있어요.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="tg-text">
                메시지
              </label>
              <Textarea
                id="tg-text"
                placeholder="전송할 메시지를 입력하세요."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                rows={6}
                className="min-h-[140px] resize-none rounded-xl border-border/50 bg-muted/25 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:border-[#229ED9]/45 focus-visible:ring-[#229ED9]/20"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              disabled={!canSend}
              onClick={() => void handleSend()}
              className="h-11 rounded-xl bg-[#229ED9] text-base font-medium text-white hover:bg-[#229ED9]/90"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2} />
                  전송
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
