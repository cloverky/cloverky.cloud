"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown, ScanFace, UploadCloud, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type Detection, detectFace } from "@/lib/vision-api";

type State = "idle" | "loading" | "done" | "error";

export default function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<State>("idle");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!["image/jpeg", "image/png"].includes(f.type)) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState("idle");
    setDetections([]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setState("idle");
    setDetections([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDetect = async () => {
    if (!file) return;
    setState("loading");
    try {
      const data = await detectFace(file);
      setDetections(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "탐지 실패");
      setState("error");
    }
  };

  const Sidebar = () => (
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
                <li><a className="transition-colors hover:text-accent" href="/lesson#data-collection">1. 데이터 수집</a></li>
                <li><a className="transition-colors hover:text-accent" href="/lesson#data-analysis">2. 승객 목록</a></li>
                <li><a className="transition-colors hover:text-accent" href="/lesson">3. 스미스 선장과 대화</a></li>
                <li><a className="transition-colors hover:text-accent" href="/lesson#model-prediction">4. 모델 예측</a></li>
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent">
              <span>이미지 분석</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-3 space-y-2 pl-1 text-muted-foreground">
                <li><a className="transition-colors hover:text-accent" href="/vision">1. vision</a></li>
                <li><a className="font-semibold text-accent" href="/vision/detect">2. 객체 탐지</a></li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </div>
    </aside>
  );

  return (
    <main className="min-h-screen bg-background pt-20 text-foreground sm:pt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:py-14">
        <Sidebar />

        <section className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Vision · 객체 탐지</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">얼굴 인식</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            사람 얼굴 이미지를 업로드하면 YOLO 모델이 얼굴을 감지하고 결과를 알려드립니다.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* 업로드 영역 */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">이미지 업로드</h2>
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !file && inputRef.current?.click()}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${
                  file ? "cursor-default border-border" : "border-border/60 hover:border-accent hover:bg-accent/5"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {preview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="preview" className="max-h-56 rounded-xl object-contain shadow" />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow ring-1 ring-border hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">파일을 드래그하거나 클릭하여 선택</p>
                    <p className="text-xs text-muted-foreground/60">JPG · PNG</p>
                  </>
                )}
              </div>

              <button
                onClick={handleDetect}
                disabled={!file || state === "loading"}
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state === "loading" ? "분석 중…" : "얼굴 탐지 시작"}
              </button>

              {state === "error" && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* 결과 영역 */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">탐지 결과</h2>
              <div className="flex min-h-64 flex-col justify-start rounded-2xl border border-border bg-card/50 p-6">
                {state === "idle" && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                    <ScanFace className="h-12 w-12 opacity-30" />
                    <p className="text-sm">이미지를 업로드하면 결과가 여기에 표시됩니다.</p>
                  </div>
                )}

                {state === "loading" && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                    <ScanFace className="h-10 w-10 animate-pulse" />
                    <p className="text-sm">YOLO 모델이 얼굴을 분석 중입니다…</p>
                  </div>
                )}

                {state === "done" && detections.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <p className="text-sm">감지된 얼굴이 없습니다.</p>
                  </div>
                )}

                {state === "done" && detections.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      감지된 객체 {detections.length}개
                    </p>
                    {detections.map((d, i) => {
                      const pct = d.confidence * 100;
                      const color =
                        pct >= 80 ? "bg-emerald-500" :
                        pct >= 50 ? "bg-yellow-400" :
                                    "bg-red-400";
                      return (
                        <div key={i} className="rounded-xl border border-border bg-background px-4 py-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                                <ScanFace className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize">{d.label}</p>
                                <p className="text-xs text-muted-foreground">매칭 정확도</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold tabular-nums text-accent">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          {/* 정확도 바 */}
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
