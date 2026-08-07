"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ImageOff, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteReceiptImage,
  fetchMyReceiptImages,
  fetchReceiptImages,
  formatFileSize,
  formatUploadedAt,
  type ReceiptImageItem,
} from "@/lib/receipts-api";

type ListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; items: ReceiptImageItem[] }
  | { kind: "error"; message: string };

type Props = {
  fetchEnabled?: boolean;
  /** 지정하면 해당 회원이 올린 영수증만 조회한다. 없으면 S3 전체를 조회한다. */
  userEmail?: string;
};

/** 인식된 내용을 사진 옆에 요약해서 보여 준다. 아직 스캔 전이면 그 사실을 알린다. */
function ParsedSummary({ item }: { item: ReceiptImageItem }) {
  const parsed = item.parsed;
  if (!parsed) {
    return (
      <p className="text-xs text-muted-foreground">
        아직 인식하지 않은 영수증입니다.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium text-foreground">
          {parsed.store_name?.trim() || "가게명 미상"}
        </span>
        {parsed.purchased_date ? (
          <span className="text-xs text-muted-foreground">
            {parsed.purchased_date}
          </span>
        ) : null}
      </div>
      {parsed.items.length > 0 ? (
        <ul className="space-y-0.5">
          {parsed.items.map((line, i) => (
            <li
              key={`${line.name}-${i}`}
              className="flex justify-between gap-3 text-xs text-muted-foreground"
            >
              <span className="truncate">{line.name}</span>
              <span className="shrink-0 tabular-nums">
                {line.quantity}
                {line.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">읽어낸 품목이 없습니다.</p>
      )}
    </div>
  );
}

export function ReceiptImageList({ fetchEnabled = false, userEmail }: Props) {
  const [state, setState] = useState<ListState>({ kind: "idle" });
  const [zoomed, setZoomed] = useState<ReceiptImageItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReceiptImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = userEmail
        ? await fetchMyReceiptImages(userEmail)
        : await fetchReceiptImages();
      setState({ kind: "success", items: data.items });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "영수증 목록을 불러오지 못했습니다.",
      });
    }
  }, [userEmail]);

  useEffect(() => {
    if (!fetchEnabled) return;
    // 섹션이 열린 뒤에만 S3를 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [fetchEnabled, load]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || !userEmail) return;
    setDeleting(true);
    try {
      await deleteReceiptImage(userEmail, pendingDelete.key);
      // 목록을 다시 부르지 않고 지운 항목만 걷어낸다 — presigned URL 재발급을 아낀다.
      setState((prev) =>
        prev.kind === "success"
          ? { ...prev, items: prev.items.filter((i) => i.key !== pendingDelete.key) }
          : prev,
      );
      toast.success("영수증을 삭제했습니다.");
      setPendingDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "영수증을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, userEmail]);

  if (state.kind === "idle") {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        좌측 메뉴의 <span className="font-medium text-foreground">영수증 확인</span>을
        누르면 S3에 저장된 영수증을 불러옵니다.
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="mt-6 flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          저장된 영수증이 없습니다.{" "}
          <Link
            href="/features/inventory"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            재고 관리
          </Link>
          의 영수증 스캔에서 올릴 수 있습니다.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-medium text-foreground">{state.items.length}</span>건
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {state.items.map((item) => (
          <li
            key={item.key}
            className="flex gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            {/* 사진은 새 탭이 아니라 같은 화면에서 크게 펼친다. */}
            <button
              type="button"
              onClick={() => setZoomed(item)}
              className="group h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
              aria-label={`${item.filename} 크게 보기`}
            >
              {/* presigned URL 은 매 조회마다 새로 발급되는 임시 링크라 next/image 최적화 대상이 아니다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.view_url}
                alt={item.filename}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <ParsedSummary item={item} />
              <div className="flex items-end justify-between gap-2">
                <p className="text-[11px] leading-tight text-muted-foreground">
                  {formatUploadedAt(item.uploaded_at)}
                  <br />
                  {formatFileSize(item.size_bytes)}
                </p>
                {userEmail ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(item)}
                    aria-label={`${item.filename} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" />
        열람 링크는 발급 후 1시간이 지나면 만료됩니다. 새로고침하면 다시 발급됩니다.
      </p>

      <Dialog open={zoomed !== null} onOpenChange={(open) => !open && setZoomed(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{zoomed?.filename}</DialogTitle>
            <DialogDescription>
              {zoomed ? formatUploadedAt(zoomed.uploaded_at) : null}
            </DialogDescription>
          </DialogHeader>
          {zoomed ? (
            <div className="max-h-[70vh] overflow-auto rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomed.view_url}
                alt={zoomed.filename}
                className="mx-auto h-auto w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 영수증을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.filename} 을(를) 지웁니다. 사진과 인식 결과가 함께
              사라지며 되돌릴 수 없습니다. 이미 등록한 재고는 그대로 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // 기본 동작은 즉시 닫기라, 삭제가 끝난 뒤에 닫도록 막는다.
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
