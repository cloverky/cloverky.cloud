"use client";

import { useCallback, useRef, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
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

export type Contact = {
  name: string;
  email: string;
  phone?: string;
};

type UploadOk = {
  kind: "ok";
  name: string;
  size: number;
  lineCount: number;
  importedCount: number;
};
type UploadErr = { kind: "error"; message: string };
type Status = UploadOk | UploadErr | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (contacts: Contact[]) => void;
};

function parseCsvContacts(text: string): Contact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("이름"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("이메일"));
  const phoneIdx = headers.findIndex(
    (h) => h.includes("phone") || h.includes("전화") || h.includes("연락처"),
  );

  if (emailIdx === -1) return [];

  return lines.slice(1).flatMap((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const email = cols[emailIdx] ?? "";
    if (!email) return [];
    return [
      {
        name: nameIdx !== -1 ? (cols[nameIdx] ?? "") : "",
        email,
        phone: phoneIdx !== -1 ? cols[phoneIdx] : undefined,
      },
    ];
  });
}

export function ContactsUploadDialog({ open, onOpenChange, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setStatus({ kind: "error", message: "업로드할 수 있는 파일은 CSV(.csv)뿐입니다." });
        return;
      }
      setBusy(true);
      setStatus(null);
      try {
        const text = await file.text();
        const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
        const contacts = parseCsvContacts(text);
        if (contacts.length === 0) {
          setStatus({
            kind: "error",
            message:
              "이메일 컬럼을 찾을 수 없거나 데이터가 없습니다.\n헤더에 'email' 또는 '이메일' 컬럼이 필요합니다.",
          });
          return;
        }
        const merged = mergeContacts(loadContacts(), contacts);
        saveContacts(merged);
        onImported(contacts);
        setStatus({
          kind: "ok",
          name: file.name,
          size: file.size,
          lineCount: lines,
          importedCount: contacts.length,
        });
      } catch {
        setStatus({ kind: "error", message: "파일을 읽는 중 오류가 발생했습니다." });
      } finally {
        setBusy(false);
      }
    },
    [onImported],
  );

  function handleClose(next: boolean) {
    if (!next) setStatus(null);
    onOpenChange(next);
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
              <Upload className="h-5 w-5" />
            </span>
            주소록 CSV 업로드
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <p className="mb-5 text-sm text-muted-foreground">
            CSV 파일에{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">email</code> 컬럼이
            필요합니다.{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">name</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">phone</code> 컬럼은
            선택입니다.
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
                  버튼을 눌러 탐색기에서{" "}
                  <span className="font-medium text-foreground">contacts.csv</span>를 고릅니다.
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
                  CSV 파일을 아래 영역으로 끌어다 놓으면 등록됩니다.
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
            <p
              className="mt-4 text-center text-sm leading-relaxed text-destructive whitespace-pre-line"
              role="alert"
            >
              {status.message}
            </p>
          )}

          {status?.kind === "ok" && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-center text-sm text-foreground">
              <p className="font-medium">처리가 완료되었습니다</p>
              <p className="mt-1 text-muted-foreground">
                파일명: {status.name} · 크기: {(status.size / 1024).toFixed(1)} KB ·
                줄 수: {status.lineCount} · 등록된 연락처: {status.importedCount}명
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
