"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown, ImageIcon, UploadCloud, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { uploadVisionImage } from "@/lib/vision-api";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function VisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = ["image/jpeg", "image/png"];

  const handleFile = useCallback((f: File) => {
    if (!accept.includes(f.type)) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState("idle");
    setResult(null);
    setErrorMsg("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setState("idle");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setState("uploading");
    try {
      const data = await uploadVisionImage(file);
      setResult(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "업로드 실패");
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-background pt-20 text-foreground sm:pt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[14rem_minmax(0,1fr)_16rem] lg:py-14">

        {/* 왼쪽 사이드바 */}
        <aside className="hidden border-r border-border/70 pr-6 text-sm lg:block">
          <div className="sticky top-28">
            <p className="mb-6 text-xs font-semibold text-muted-foreground">수업</p>
            <nav className="space-y-5">
              <Collapsible>
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent">
                  <span>타이타닉</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-3 space-y-2 pl-1 text-muted-foreground">
                    <li>
                      <a className="transition-colors hover:text-accent" href="/lesson#data-collection">
                        1. 데이터 수집
                      </a>
                    </li>
                    <li>
                      <a className="transition-colors hover:text-accent" href="/lesson#data-analysis">
                        2. 승객 목록
                      </a>
                    </li>
                    <li>
                      <a className="transition-colors hover:text-accent" href="/lesson">
                        3. 스미스 선장과 대화
                      </a>
                    </li>
                    <li>
                      <a className="transition-colors hover:text-accent" href="/lesson#model-prediction">
                        4. 모델 예측
                      </a>
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen>
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent">
                  <span>이미지 분석</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-3 space-y-2 pl-1 text-muted-foreground">
                    <li>
                      <a className="font-semibold text-accent" href="/vision">
                        1. vision
                      </a>
                    </li>
                    <li>
                      <a className="transition-colors hover:text-accent" href="/vision/detect">
                        2. 객체 탐지
                      </a>
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </nav>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <section className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Vision
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">이미지 업로드</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            JPG 또는 PNG 파일을 업로드하세요.
          </p>

          <div className="mt-10 space-y-6">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !file && inputRef.current?.click()}
              className={`flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors ${
                file
                  ? "cursor-default border-border"
                  : "border-border/60 hover:border-accent hover:bg-accent/5"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={onInputChange}
              />

              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-64 rounded-xl object-contain shadow"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow ring-1 ring-border hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    파일을 드래그하거나 클릭하여 선택
                  </p>
                  <p className="text-xs text-muted-foreground/60">JPG · PNG</p>
                </>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm">
                <ImageIcon className="h-4 w-4 shrink-0 text-accent" />
                <span className="flex-1 truncate text-foreground">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || state === "uploading"}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state === "uploading" ? "업로드 중…" : "업로드"}
            </button>

            {state === "error" && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMsg}
              </p>
            )}

            {state === "done" && result && (
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">응답</p>
                <pre className="overflow-x-auto text-xs text-foreground">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* 오른쪽 빈 영역 */}
        <aside />
      </div>
    </main>
  );
}
