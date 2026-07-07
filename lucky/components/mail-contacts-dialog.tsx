"use client";

import { useCallback, useRef, useState } from "react";
import { BookUser, FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { loadContacts, mergeContacts, saveContacts } from "@/lib/contacts-store";
import { uploadContactsCsv } from "@/lib/contacts-api";
import type { Contact } from "@/components/contacts-upload-dialog";

type UploadStatus =
  | { kind: "ok"; saved: number; skipped: number; fileName: string }
  | { kind: "error"; message: string }
  | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (email: string) => void;
};

function parseCsvForLocalStore(text: string): Contact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = headers.findIndex(
    (h) => h.includes("email") || h.includes("이메일") || h === "e-mail 1 - value",
  );
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("이름"));
  const phoneIdx = headers.findIndex(
    (h) =>
      h.includes("phone") ||
      h.includes("전화") ||
      h.includes("연락처") ||
      h === "phone 1 - value",
  );
  if (emailIdx === -1) return [];
  return lines.slice(1).flatMap((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const email = cols[emailIdx] ?? "";
    if (!email) return [];
    const name =
      nameIdx !== -1
        ? [cols[nameIdx], cols[nameIdx + 1], cols[nameIdx + 2]]
            .filter(Boolean)
            .join(" ")
            .trim()
        : "";
    return [{ name, email, phone: phoneIdx !== -1 ? cols[phoneIdx] : undefined }];
  });
}

export function MailContactsDialog({ open, onOpenChange, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<UploadStatus>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts());

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setStatus({ kind: "error", message: "CSV(.csv) 파일만 업로드 가능합니다." });
        return;
      }
      setBusy(true);
      setStatus(null);
      try {
        const [result, text] = await Promise.all([
          uploadContactsCsv(file),
          file.text(),
        ]);
        const parsed = parseCsvForLocalStore(text);
        const merged = mergeContacts(loadContacts(), parsed);
        saveContacts(merged);
        setContacts(merged);
        setStatus({ kind: "ok", saved: result.saved, skipped: result.skipped, fileName: file.name });
      } catch (e) {
        setStatus({ kind: "error", message: e instanceof Error ? e.message : "업로드에 실패했습니다." });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  function handleClose(next: boolean) {
    if (!next) setStatus(null);
    onOpenChange(next);
  }

  function handleSelect(email: string) {
    onSelect(email);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton
        className="flex w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden border-border/80 p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <BookUser className="h-5 w-5" />
            </span>
            메일관리 — 주소록 CSV 불러오기
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-6">
          {/* 업로드 섹션 */}
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Google Contacts에서 내보낸 CSV를 업로드하면 주소록이 등록됩니다.
              <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">E-mail 1 - Value</code>{" "}
              컬럼이 필요합니다.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void processFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* 카드 1: 파일 선택 */}
              <Card className="border-border/60 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="h-5 w-5 text-accent" />
                    파일에서 선택
                  </CardTitle>
                  <CardDescription className="text-xs">
                    버튼을 눌러 탐색기에서 contacts.csv를 고릅니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-border hover:bg-secondary"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                  >
                    CSV 파일 선택
                  </Button>
                </CardContent>
              </Card>

              {/* 카드 2: 드래그 앤 드롭 */}
              <Card className="border-border/60 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-5 w-5 text-accent" />
                    드래그 앤 드롭
                  </CardTitle>
                  <CardDescription className="text-xs">
                    CSV 파일을 아래 영역으로 끌어다 놓으세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void processFile(e.dataTransfer.files?.[0]);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setDragOver(false);
                    }}
                    onClick={() => !busy && inputRef.current?.click()}
                    className={cn(
                      "flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                      dragOver
                        ? "border-accent bg-accent/10"
                        : "border-border/80 bg-muted/20 hover:border-accent/50 hover:bg-muted/40",
                      busy && "pointer-events-none opacity-60",
                    )}
                  >
                    <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      여기에 파일을 놓거나 클릭
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">contacts.csv 권장</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {status?.kind === "error" && (
              <p className="mt-3 text-center text-sm text-destructive" role="alert">
                {status.message}
              </p>
            )}
            {status?.kind === "ok" && (
              <p className="mt-3 text-center text-sm text-foreground">
                <span className="font-medium">{status.fileName}</span> 업로드 완료 —{" "}
                저장 {status.saved}건 · 건너뜀 {status.skipped}건
              </p>
            )}
          </div>

          {/* 연락처 목록 */}
          {contacts.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                주소록 ({contacts.length}명) — 선택하면 받는 사람에 입력됩니다
              </p>
              <ul className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {contacts.map((c) => (
                  <li key={c.email} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      {c.name && (
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs"
                      onClick={() => handleSelect(c.email)}
                    >
                      선택
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contacts.length === 0 && status === null && (
            <p className="text-center text-sm text-muted-foreground">
              등록된 연락처가 없습니다. 위에서 CSV를 업로드하세요.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
