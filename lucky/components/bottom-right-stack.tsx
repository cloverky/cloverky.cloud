"use client";

import { useEffect, useState } from "react";
import { Bell, Inbox, Mail } from "lucide-react";
import { WeatherWidget } from "@/components/weather-widget";
import { GeminiChatDialog } from "@/components/gemini-chat-dialog";
import { MailComposeDialog } from "@/components/mail-compose-dialog";
import { MailInboxPanel } from "@/components/mail-inbox-panel";
import { NotificationPanel } from "@/components/notification-panel";
import { CloverIcon } from "@/components/clover-icon";
import { getUnreadCount } from "@/lib/notification-store";
import { cn } from "@/lib/utils";

type BottomRightStackProps = {
  className?: string;
};

export function BottomRightStack({ className }: BottomRightStackProps) {
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    setNotifCount(getUnreadCount());
    const handler = () => setNotifCount(getUnreadCount());
    window.addEventListener("cloverky:new-notification", handler);
    return () => window.removeEventListener("cloverky:new-notification", handler);
  }, []);

  return (
    <>
      <div
        className={cn(
          "fixed z-40 flex flex-col items-end gap-3",
          "bottom-4 right-4",
          "pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]",
          "sm:bottom-6 sm:right-6",
          className,
        )}
      >
        {/* 알림 */}
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full",
            "border border-border bg-card text-accent shadow-sm",
            "ring-1 ring-inset ring-white/[0.04]",
            "transition hover:border-accent/35 hover:bg-accent/10",
            "focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:outline-none",
          )}
          aria-label="알림"
        >
          <Bell className="h-5 w-5" strokeWidth={1.85} />
          {notifCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {notifCount > 99 ? "99" : notifCount}
            </span>
          )}
        </button>

        {/* 수신함 */}
        <button
          type="button"
          onClick={() => setInboxOpen((v) => !v)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-border bg-card text-accent shadow-sm",
            "ring-1 ring-inset ring-white/[0.04]",
            "transition hover:border-accent/35 hover:bg-accent/10",
            "focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:outline-none",
          )}
          aria-label="수신함"
        >
          <Inbox className="h-5 w-5" strokeWidth={1.85} />
        </button>

        {/* 이메일 작성 */}
        <button
          type="button"
          onClick={() => setMailOpen(true)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-border bg-card text-accent shadow-sm",
            "ring-1 ring-inset ring-white/[0.04]",
            "transition hover:border-accent/35 hover:bg-accent/10",
            "focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:outline-none",
          )}
          aria-label="이메일 작성"
        >
          <Mail className="h-5 w-5" strokeWidth={1.85} />
        </button>

        {/* Gemini */}
        <button
          type="button"
          onClick={() => setGeminiOpen(true)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-border bg-card text-accent shadow-sm",
            "ring-1 ring-inset ring-white/[0.04]",
            "transition hover:border-accent/35 hover:bg-accent/10",
            "focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:outline-none",
          )}
          aria-label="Gemini 채팅 열기"
        >
          <CloverIcon className="h-5 w-5" strokeWidth={1.85} />
        </button>

        <WeatherWidget />
      </div>

      <NotificationPanel
        open={notifOpen}
        onOpenChange={setNotifOpen}
        onCountChange={setNotifCount}
      />
      <MailInboxPanel open={inboxOpen} onOpenChange={setInboxOpen} />
      <MailComposeDialog open={mailOpen} onOpenChange={setMailOpen} />
      <GeminiChatDialog open={geminiOpen} onOpenChange={setGeminiOpen} />
    </>
  );
}
