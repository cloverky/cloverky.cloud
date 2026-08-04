"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
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

export function ReceiptImageList({ fetchEnabled = false, userEmail }: Props) {
  const [state, setState] = useState<ListState>({ kind: "idle" });

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

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.items.map((item) => (
          <li
            key={item.key}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <a
              href={item.view_url}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
                {/* presigned URL 은 매 조회마다 새로 발급되는 임시 링크라 next/image 최적화 대상이 아니다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.view_url}
                  alt={item.filename}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </a>
            <div className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <p
                  className="truncate text-sm font-medium text-foreground"
                  title={item.filename}
                >
                  {item.filename}
                </p>
                <a
                  href={item.view_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-accent"
                  aria-label={`${item.filename} 원본 열기`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatUploadedAt(item.uploaded_at)} · {formatFileSize(item.size_bytes)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" />
        열람 링크는 발급 후 1시간이 지나면 만료됩니다. 새로고침하면 다시 발급됩니다.
      </p>
    </div>
  );
}
