"use client";

import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronDown, Menu } from "lucide-react";

/** Radix Sheet는 SSR/CSR id가 달라 hydration 오류가 날 수 있어 마운트 후에만 렌더합니다. */
export function LessonMobileNav({
  onPassengerListClick,
}: {
  onPassengerListClick?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="fixed right-5 top-20 z-40 lg:hidden" aria-hidden>
        <div className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="fixed right-5 top-20 z-40 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:border-accent/40 hover:text-accent"
            aria-label="수업 목차 열기"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[18rem] gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-5 text-left">
            <SheetTitle className="text-base">수업</SheetTitle>
          </SheetHeader>
          <nav className="px-5 py-6 text-sm" aria-label="모바일 수업 목차">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent">
                <span>타이타닉</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-4 space-y-3 pl-1 text-muted-foreground">
                  <li>
                    <SheetClose asChild>
                      <a className="transition-colors hover:text-accent" href="#data-collection">
                        1. 데이터 수집
                      </a>
                    </SheetClose>
                  </li>
                  <li>
                    <SheetClose asChild>
                      <a
                        className="transition-colors hover:text-accent"
                        href="#data-analysis"
                        onClick={onPassengerListClick}
                      >
                        2. 승객 목록
                      </a>
                    </SheetClose>
                  </li>
                  <li>
                    <SheetClose asChild>
                      <a className="transition-colors hover:text-accent" href="#model-prediction">
                        3. 모델 예측
                      </a>
                    </SheetClose>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
