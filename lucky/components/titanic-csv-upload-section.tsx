"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const EXPECTED_FILENAME = "titanic.csv";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

type UploadOk = {
  kind: "ok";
  name: string;
  size: number;
  lineCount: number;
  nameMatches: boolean;
  uploadedCount: number;
};

type UploadErr = { kind: "error"; message: string };

type Status = UploadOk | UploadErr | null;

function readCsvFile(file: File): Promise<UploadOk | UploadErr> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".csv")) {
    return Promise.resolve({
      kind: "error",
      message: "업로드할 수 있는 파일은 CSV(.csv)뿐입니다.",
    });
  }

  return file.text().then((text) => {
    const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
    const nameMatches =
      file.name.toLowerCase() === EXPECTED_FILENAME.toLowerCase();
    return {
      kind: "ok",
      name: file.name,
      size: file.size,
      lineCount: lines,
      nameMatches,
      uploadedCount: 0,
    };
  });
}

function isLocalDevHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

type TitanicCsvUploadSectionProps = {
  /**
   * true면 localhost + 경로(/) 제한을 건너뜁니다.
   * 타이타닉 전용 페이지에서 업로드 UI를 항상 보일 때 사용합니다.
   */
  bypassLocalGuard?: boolean;
  /**
   * true면 드래그 앤 드롭 전용 영역(업로드 창)과 별도 "업로드" 버튼만 노출합니다.
   */
  splitDropAndButton?: boolean;
  /** 업로드 성공 시 호출됩니다. */
  onUploadSuccess?: () => void;
};

export function TitanicCsvUploadSection({
  bypassLocalGuard = false,
  splitDropAndButton = false,
  onUploadSuccess,
}: TitanicCsvUploadSectionProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  type UploadUiState = {
    localRootOk: boolean;
    dragOver: boolean;
    status: Status;
    busy: boolean;
  };

  const [ui, setUi] = useState<UploadUiState>({
    localRootOk: bypassLocalGuard,
    dragOver: false,
    status: null,
    busy: false,
  });

  const patchUi = (patch: Partial<UploadUiState>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (bypassLocalGuard) return;
    patchUi({
      localRootOk: pathname === "/" && isLocalDevHost(window.location.hostname),
    });
  }, [pathname, bypassLocalGuard]);

  const applyFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    patchUi({ busy: true, status: null });
    try {
      const result = await readCsvFile(file);
      if (result.kind === "error") {
        patchUi({ status: result });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/titanic/james/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = "업로드 요청에 실패했습니다.";
        try {
          const body = (await res.json()) as { detail?: string };
          if (body?.detail) message = body.detail;
        } catch {
          // 응답이 JSON이 아니면 기본 메시지 사용
        }
        patchUi({ status: { kind: "error", message } });
        return;
      }

      const body = (await res.json()) as { count?: number };
      patchUi({
        status: {
          ...result,
          uploadedCount: typeof body.count === "number" ? body.count : 0,
        },
      });
      onUploadSuccess?.();
    } catch {
      patchUi({
        status: {
          kind: "error",
          message:
            "서버에 연결하지 못했습니다. 백엔드 실행 상태와 Neon DB 연결을 확인해 주세요.",
        },
      });
    } finally {
      patchUi({ busy: false });
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    void applyFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    patchUi({ dragOver: false });
    const file = e.dataTransfer.files?.[0];
    void applyFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    patchUi({ dragOver: true });
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    patchUi({ dragOver: false });
  };

  if (!ui.localRootOk) return null;

  if (splitDropAndButton) {
    return (
      <section
        id="titanic-csv-upload"
        className="mx-auto w-full max-w-4xl py-8"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={onInputChange}
          disabled={ui.busy}
        />

        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {EXPECTED_FILENAME} 업로드
          </h2>
          <p className="mx-auto mt-2 w-full text-center text-sm leading-relaxed text-muted-foreground sm:whitespace-nowrap sm:text-base">
            아래 점선 영역에 파일을 끌어다 놓거나, 업로드 버튼을 눌러 파일을 선택할 수 있습니다.
          </p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            ui.dragOver
              ? "border-accent bg-accent/10"
              : "border-border bg-muted/30 hover:border-accent/40",
            ui.busy && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <span className="text-sm font-medium leading-relaxed text-foreground">
            이 영역으로 CSV를 드래그해서 놓아 주세요
          </span>
          <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
            권장 파일 이름: {EXPECTED_FILENAME}
          </span>
        </div>

        <div className="mt-6 flex w-full justify-center">
          <Button
            type="button"
            size="lg"
            className="min-w-[200px] bg-foreground text-background hover:bg-foreground/90"
            disabled={ui.busy}
            onClick={() => inputRef.current?.click()}
          >
            {ui.busy ? "처리 중…" : "업로드"}
          </Button>
        </div>

        {ui.status?.kind === "error" && (
          <p className="mt-6 text-center text-sm leading-relaxed text-red-600 whitespace-pre-line">
            {ui.status.message}
          </p>
        )}

        {ui.status?.kind === "ok" && (
          <div className="mt-6 w-full rounded-lg border border-border bg-muted/40 px-4 py-4 text-center text-sm leading-relaxed text-foreground">
            <p className="font-semibold">처리가 완료되었습니다</p>
            <p className="mt-2 text-neutral-700">
              파일 이름: {ui.status.name}
              <br />
              크기: {(ui.status.size / 1024).toFixed(1)} KB · 줄 수: {ui.status.lineCount}
              <br />
              서버 수신 행 수: {ui.status.uploadedCount}
            </p>
            {!ui.status.nameMatches && (
              <p className="mt-3 text-sm leading-relaxed text-amber-800">
                파일 이름은 <strong>{EXPECTED_FILENAME}</strong> 을 권장합니다.
              </p>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      id={bypassLocalGuard ? "titanic-csv-upload" : "titanic-csv"}
      className={cn(
        "border-b py-20",
        bypassLocalGuard
          ? "border-neutral-200 bg-neutral-50/40"
          : "border-border/50 bg-background",
      )}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            {EXPECTED_FILENAME} 업로드
          </h2>
          <p className="mt-2 text-muted-foreground">
            파일 선택 또는 드래그 앤 드롭으로 CSV를 등록할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-accent" />
                파일에서 선택
              </CardTitle>
              <CardDescription>
                버튼을 눌러 탐색기에서{" "}
                <span className="font-medium text-foreground">
                  {EXPECTED_FILENAME}
                </span>
                를 고릅니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={onInputChange}
                disabled={ui.busy}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-border hover:bg-secondary"
                disabled={ui.busy}
                onClick={() => inputRef.current?.click()}
              >
                CSV 파일 선택
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-accent" />
                드래그 앤 드롭
              </CardTitle>
              <CardDescription>
                CSV 파일을 아래 영역으로 끌어다 놓으면 업로드됩니다.
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
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={cn(
                  "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                  ui.dragOver
                    ? "border-accent bg-accent/10"
                    : "border-border/80 bg-muted/20 hover:border-accent/50 hover:bg-muted/40",
                  ui.busy && "pointer-events-none opacity-60",
                )}
                onClick={() => !ui.busy && inputRef.current?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  여기에 파일을 놓거나 클릭하여 선택
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {EXPECTED_FILENAME} 권장
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {ui.status?.kind === "error" && (
          <p className="mt-6 text-center text-sm text-destructive">
            {ui.status.message}
          </p>
        )}

        {ui.status?.kind === "ok" && (
          <div className="mt-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-center text-sm text-foreground">
            <p className="font-medium">업로드 처리 완료</p>
            <p className="mt-1 text-muted-foreground">
              파일명: {ui.status.name} · 크기: {(ui.status.size / 1024).toFixed(1)}{" "}
              KB · 줄 수: {ui.status.lineCount} · 서버 수신 행 수:{" "}
              {ui.status.uploadedCount}
            </p>
            {!ui.status.nameMatches && (
              <p className="mt-2 text-amber-600 dark:text-amber-500">
                권장 파일명은 <strong>{EXPECTED_FILENAME}</strong> 입니다.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
