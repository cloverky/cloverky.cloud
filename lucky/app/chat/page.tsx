"use client";

import { ChevronDown, Link2, Refrigerator } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FridgeAssistantChat } from "@/components/fridge-assistant-chat";
import { LangchainChat } from "@/components/langchain-chat";

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

        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent">
            <span>이미지 분석</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-3 space-y-2 pl-1 text-muted-foreground">
              <li>
                <a className="transition-colors hover:text-accent" href="/vision">
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

        <a
          className="block rounded-md py-1 text-left font-semibold text-accent"
          href="/chat"
        >
          대화창
        </a>
      </nav>
    </div>
  </aside>
);

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground sm:pt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:py-14">
        <Sidebar />

        <section className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Chat
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">대화창</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            냉장고 속 재고와 유통기한, 지금 소비해야 할 재료로 만들 수 있는 레시피를
            물어보세요.
          </p>

          <div className="mt-10 max-w-2xl rounded-2xl border border-border bg-card/50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Refrigerator className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold">냉장고 어시스턴트</h2>
            </div>
            <FridgeAssistantChat />
          </div>

          <div className="mt-10 max-w-2xl rounded-2xl border border-border bg-card/50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold">랭체인 어시스턴트</h2>
            </div>
            <LangchainChat />
          </div>
        </section>
      </div>
    </main>
  );
}
