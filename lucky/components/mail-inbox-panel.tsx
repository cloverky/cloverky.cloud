"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Inbox, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAllInbox, deleteInboxItem, fetchInbox, type InboxItem } from "@/lib/mail-api";
import { getPushState, subscribePush, unsubscribePush } from "@/lib/push-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MailItem({
  item,
  onDelete,
}: {
  item: InboxItem;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "group rounded-xl border border-border/50 bg-card/60 px-4 py-3",
        "transition hover:border-accent/30 hover:bg-accent/5",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-accent">{item.from_email}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">
              {item.subject ?? "(제목 없음)"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground">{formatTime(item.received_at)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className={cn(
                "ml-1 flex h-5 w-5 items-center justify-center rounded",
                "text-muted-foreground opacity-0 group-hover:opacity-100",
                "transition hover:text-destructive",
              )}
              aria-label="삭제"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {expanded && item.body && (
          <div className="mt-2 break-keep text-[13px] leading-relaxed text-muted-foreground border-t border-border/40 pt-2 space-y-1.5">
            {splitSentences(item.body).map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

export function MailInboxPanel({ open, onOpenChange }: Props) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushState, setPushState] = useState<"granted" | "denied" | "default">("default");
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const data = await fetchInbox();
    setItems(data);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    await deleteInboxItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleDeleteAll() {
    await deleteAllInbox();
    setItems([]);
  }

  useEffect(() => {
    if (open) {
      load();
      getPushState().then(setPushState);
    }
  }, [open]);

  async function handleTogglePush() {
    if (pushState === "granted") {
      await unsubscribePush();
      setPushState("default");
    } else {
      const ok = await subscribePush();
      setPushState(ok ? "granted" : "denied");
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-50 flex flex-col",
        "bottom-20 right-4 sm:right-6",
        "w-[min(400px,calc(100vw-2rem))]",
        "max-h-[70vh]",
        "rounded-2xl border border-border/70 bg-card shadow-2xl",
        "ring-1 ring-white/[0.05]",
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Inbox className="h-4 w-4 text-accent" />
          수신함
          {items.length > 0 && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {pushState !== "denied" && (
            <button
              type="button"
              onClick={handleTogglePush}
              title={pushState === "granted" ? "알림 끄기" : "새 메일 알림 받기"}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition",
                pushState === "granted"
                  ? "text-accent hover:text-muted-foreground"
                  : "text-muted-foreground hover:text-accent",
              )}
              aria-label="알림 설정"
            >
              {pushState === "granted" ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition hover:text-destructive"
              aria-label="전체 삭제"
            >
              <Trash2 className="h-3 w-3" />
              전체삭제
            </button>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            aria-label="새로고침"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">수신된 메일이 없습니다.</p>
        ) : (
          items.map((item) => (
            <MailItem key={item.id} item={item} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
