"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clearNotifications,
  deleteNotification,
  loadNotifications,
  markAllRead,
  type AppNotification,
} from "@/lib/notification-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (count: number) => void;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function NotificationPanel({ open, onOpenChange, onCountChange }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  function refresh() {
    const list = loadNotifications();
    setItems(list);
    onCountChange?.(list.length);
  }

  useEffect(() => {
    if (open) {
      markAllRead();
      refresh();
      onCountChange?.(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleDelete(id: string) {
    deleteNotification(id);
    const next = items.filter((n) => n.id !== id);
    setItems(next);
    onCountChange?.(next.length);
  }

  function handleClear() {
    clearNotifications();
    setItems([]);
    onCountChange?.(0);
  }

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 sm:right-6",
        "flex w-[calc(100vw-2rem)] max-w-sm flex-col",
        "rounded-2xl border border-border/70 bg-card shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]",
        "ring-1 ring-white/[0.05]",
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">알림</span>
          {items.length > 0 && (
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[11px] font-medium text-accent">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="전체 삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto p-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">알림이 없어요</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group flex items-end justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="mb-4 flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground transition hover:text-destructive"
                aria-label="삭제"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <div className="max-w-[85%]">
                <div
                  className={cn(
                    "rounded-2xl rounded-tr-sm px-3.5 py-2.5",
                    "bg-[#2aabee]/20 text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.text}</p>
                </div>
                <p className="mt-0.5 text-right text-[11px] text-muted-foreground">
                  {formatTime(item.sentAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
