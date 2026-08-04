"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const TELEGRAM_CHAT_ID_KEY = "cloverky:telegram_chat_id";

export function getTelegramChatId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TELEGRAM_CHAT_ID_KEY) ?? "";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TelegramSettingsDialog({ open, onOpenChange }: Props) {
  const [chatId, setChatId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      // localStorage는 SSR에서 접근 불가 — 다이얼로그가 열릴 때 복원한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChatId(getTelegramChatId());
      setSaved(false);
    }
  }, [open]);

  function handleSave() {
    localStorage.setItem(TELEGRAM_CHAT_ID_KEY, chatId.trim());
    setSaved(true);
    setTimeout(() => onOpenChange(false), 800);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-sm",
          "bg-card shadow-[0_28px_56px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]",
        )}
      >
        <DialogHeader className="relative border-b border-border/60 px-6 py-4 text-left">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#229ED9]/10 via-transparent to-transparent"
            aria-hidden
          />
          <DialogTitle className="relative flex items-center gap-3 text-xl font-semibold">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9] ring-1 ring-[#229ED9]/25">
              <Bell className="h-5 w-5" />
            </span>
            텔레그램 알림 설정
          </DialogTitle>
          <DialogDescription className="sr-only">
            이메일 발송 확인 알림을 받을 텔레그램 Chat ID를 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            이메일 발송 후 내 텔레그램으로 자동 확인 알림이 전송됩니다.
            <br />
            Chat ID는{" "}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">@userinfobot</span>
            에게 <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/start</span>
            를 보내면 확인할 수 있어요.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="tg-chat-id-setting">
              내 Chat ID
            </label>
            <Input
              id="tg-chat-id-setting"
              placeholder="123456789"
              value={chatId}
              onChange={(e) => { setChatId(e.target.value); setSaved(false); }}
              className="border-border/50 bg-muted/25 focus-visible:border-[#229ED9]/45 focus-visible:ring-[#229ED9]/20"
            />
          </div>

          <Button
            type="button"
            disabled={!chatId.trim()}
            onClick={handleSave}
            className="h-10 rounded-xl bg-[#229ED9] font-medium text-white hover:bg-[#229ED9]/90"
          >
            {saved ? "✓ 저장됨" : "저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
