"use client";

import { useEffect, useRef, useState } from "react";
import { BookUser, Loader2, Mail, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMail } from "@/lib/mail-api";
import { cn } from "@/lib/utils";
import { loadContacts } from "@/lib/contacts-store";
import { MailContactsDialog } from "@/components/mail-contacts-dialog";
import { saveNotification } from "@/lib/notification-store";
import type { Contact } from "@/components/contacts-upload-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MailComposeDialog({ open, onOpenChange }: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showContactsPicker, setShowContactsPicker] = useState(false);

  // 자동완성
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 다이얼로그 열릴 때 연락처 로드
  useEffect(() => {
    if (open) setContacts(loadContacts());
  }, [open]);

  // CSV 업로드 후 연락처 갱신
  function handleContactsRefresh() {
    setContacts(loadContacts());
  }

  function handleToChange(value: string) {
    setTo(value);
    setActiveIdx(-1);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = value.toLowerCase();
    const matched = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0);
  }

  function pickSuggestion(c: Contact) {
    setTo(c.email);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const canSend = to.trim() && subject.trim() && context.trim() && !loading;

  async function handleSend() {
    if (!canSend) return;
    setLoading(true);
    setError(null);
    setLoadingMsg("Exaone이 메일을 작성 중입니다…");
    const timer = setTimeout(() => setLoadingMsg("메일 내용 생성 중 (로컬 AI 모델 실행 중)…"), 5000);
    try {
      await sendMail({ to: to.trim(), subject: subject.trim(), context: context.trim() });
      saveNotification(
        `✉️ 이메일 발송 완료\n받는 사람: ${to.trim()}\n제목: ${subject.trim()}\n내용: ${context.trim()}`,
      );
      setSent(true);
      setTo("");
      setSubject("");
      setContext("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setLoadingMsg("");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSent(false);
      setError(null);
      setShowSuggestions(false);
    }
    onOpenChange(next);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton
          className={cn(
            "flex w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-visible border-border/80 p-0 sm:max-w-lg",
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
                <Mail className="h-5 w-5" strokeWidth={2} />
              </span>
              이메일 작성
            </DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Mail className="h-6 w-6" />
              </span>
              <p className="text-base font-medium text-foreground">발송 완료!</p>
              <p className="text-sm text-muted-foreground">
                Exaone이 내용을 작성해 메일을 보냈어요.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setSent(false)}>
                새 메일 작성
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-6">
              {/* 받는 사람 + 자동완성 */}
              <div className="relative flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground" htmlFor="mail-to">
                    받는 사람
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowContactsPicker(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    <BookUser className="h-3.5 w-3.5" />
                    메일관리
                  </button>
                </div>

                <Input
                  ref={inputRef}
                  id="mail-to"
                  type="text"
                  placeholder="이름 또는 이메일 입력"
                  value={to}
                  onChange={(e) => handleToChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  disabled={loading}
                  autoComplete="off"
                  className="border-border/50 bg-muted/25 focus-visible:border-accent/45 focus-visible:ring-accent/20"
                />

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (
                  <ul
                    ref={suggestionsRef}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
                  >
                    {suggestions.map((c, idx) => (
                      <li
                        key={c.email}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onMouseDown={() => pickSuggestion(c)}
                        className={cn(
                          "flex cursor-pointer flex-col px-4 py-2.5 transition-colors",
                          idx === activeIdx
                            ? "bg-accent/15 text-accent"
                            : "hover:bg-muted/60",
                          idx !== 0 && "border-t border-border/40",
                        )}
                      >
                        {c.name && (
                          <span className="text-sm font-medium text-foreground leading-tight">
                            {c.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-xs",
                            idx === activeIdx
                              ? "text-accent/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {c.email}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="mail-subject">
                  제목
                </label>
                <Input
                  id="mail-subject"
                  placeholder="메일 제목"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  className="border-border/50 bg-muted/25 focus-visible:border-accent/45 focus-visible:ring-accent/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="mail-context">
                  내용
                </label>
                <Textarea
                  id="mail-context"
                  placeholder="전달할 내용을 입력하면 Exaone이 다듬어서 보냅니다."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading}
                  rows={6}
                  className={cn(
                    "min-h-[140px] resize-none rounded-xl border-border/50 bg-muted/25 text-sm leading-relaxed",
                    "placeholder:text-muted-foreground",
                    "focus-visible:border-accent/45 focus-visible:ring-accent/20",
                  )}
                />
              </div>

              {error && (
                <p
                  className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {loading && (
                <p className="text-center text-sm text-muted-foreground animate-pulse">
                  {loadingMsg}
                </p>
              )}

              <Button
                type="button"
                className={cn(
                  "h-11 rounded-xl bg-accent text-base font-medium text-accent-foreground",
                  "hover:bg-accent/90",
                )}
                disabled={!canSend}
                onClick={() => void handleSend()}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <SendHorizontal className="h-4 w-4" strokeWidth={2} />
                    발송
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MailContactsDialog
        open={showContactsPicker}
        onOpenChange={(next) => {
          setShowContactsPicker(next);
          if (!next) handleContactsRefresh();
        }}
        onSelect={(email) => {
          setTo(email);
          setShowSuggestions(false);
        }}
      />
    </>
  );
}
