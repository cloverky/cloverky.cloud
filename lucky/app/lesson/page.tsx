"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonMobileNav } from "@/components/lesson-mobile-nav";
import { TitanicPassengerList } from "@/components/titanic-passenger-list";
import { TitanicCsvUploadSection } from "@/components/titanic-csv-upload-section";
import { SmithCaptainChat } from "@/components/smith-captain-chat";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BarChart3, Brain, ChevronDown, Database, Ship, Sparkles } from "lucide-react";

const lessonGoals = [
  "데이터 수집 및 전처리 기술 습득",
  "탐색적 데이터 분석(EDA) 실습",
  "분류 모델 개발 및 성능 평가",
  "실제 데이터 기반 인사이트 도출",
];

const lessonTopics = [
  "타이타닉 탑승객 데이터셋 분석",
  "성별, 연령, 객실 등급에 따른 생존율 분석",
  "로지스틱 회귀 모델을 이용한 생존 예측",
  "모델 성능 평가 및 해석",
];

const stats = [
  { icon: Ship, label: "데이터셋", value: "Titanic" },
  { icon: Database, label: "분석 대상", value: "891명" },
  { icon: BarChart3, label: "핵심 작업", value: "EDA" },
  { icon: Brain, label: "모델", value: "ML 분류" },
];

export default function LessonPage() {
  const [hasUploadedCsv, setHasUploadedCsv] = useState(false);
  const [passengerListRequested, setPassengerListRequested] = useState(false);
  const [showCaptainChat, setShowCaptainChat] = useState(false);
  const captainChatRef = useRef<HTMLElement>(null);

  const openPassengerList = useCallback(() => {
    setPassengerListRequested(true);
  }, []);

  const openCaptainChat = useCallback(() => {
    setShowCaptainChat(true);
    setTimeout(() => {
      captainChatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  useEffect(() => {
    if (window.location.hash === "#data-analysis") {
      setPassengerListRequested(true);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background pt-20 text-foreground sm:pt-24">
      <LessonMobileNav onPassengerListClick={openPassengerList} />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[14rem_minmax(0,1fr)_16rem] lg:py-14">
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
                    <a className="transition-colors hover:text-accent" href="#data-collection">
                      1. 데이터 수집
                    </a>
                  </li>
                  <li>
                    <a
                      className="transition-colors hover:text-accent"
                      href="#data-analysis"
                      onClick={openPassengerList}
                    >
                      2. 승객 목록
                    </a>
                  </li>
                  <li>
                    <a
                      className="cursor-pointer transition-colors hover:text-accent"
                      onClick={openCaptainChat}
                    >
                      3. 스미스 선장과 대화
                    </a>
                  </li>
                  <li>
                    <a className="transition-colors hover:text-accent" href="#model-prediction">
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
              className="block rounded-md py-1 text-left font-semibold text-foreground transition-colors hover:text-accent"
              href="/chat"
            >
              대화창
            </a>
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Lesson
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            타이타닉 모델 분석
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            역사 속 가장 유명한 해양사고인 타이타닉 침몰 사건을 데이터 분석을 통해
            살펴봅니다. 머신러닝 모델을 활용하여 승객의 생존 확률을 예측하는 방법을
            배웁니다.
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <h2 className="text-lg font-bold">학습 목표</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                {lessonGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold">주요 내용</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                {lessonTopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </section>

            <section
              id="data-collection"
              className="scroll-mt-28 rounded-2xl border border-border bg-card/50 p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold">데이터 수집</h2>
              </div>
              <p className="max-w-3xl text-[15px] leading-8 text-muted-foreground">
                아래 영역에 파일을 업로드하면, 분석 단계에서 사용할 데이터를 불러옵니다.
              </p>
              <TitanicCsvUploadSection
                bypassLocalGuard
                splitDropAndButton
                onUploadSuccess={() => setHasUploadedCsv(true)}
              />
            </section>

            <section
              id="data-analysis"
              className="scroll-mt-28 rounded-2xl border border-border bg-card/50 p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold">승객 목록</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                업로드한 타이타닉 데이터를 바탕으로 성별, 연령, 객실 등급, 탑승 요금
                등이 생존 여부와 어떤 관계가 있는지 살펴봅니다.
              </p>
              {!hasUploadedCsv && (
                <p className="mt-4 text-sm text-muted-foreground">
                  먼저 1. 데이터 수집에서 CSV를 업로드해 주세요.
                </p>
              )}
              <TitanicPassengerList fetchEnabled={passengerListRequested} />
            </section>

            {showCaptainChat && (
              <section
                id="captain-chat"
                ref={captainChatRef}
                className="scroll-mt-28 rounded-2xl border border-border bg-card/50 p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Ship className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-bold">스미스 선장과 대화</h2>
                </div>
                <p className="mb-5 text-sm leading-7 text-muted-foreground">
                  타이타닉의 에드워드 스미스 선장에게 1912년 항해에 대해 직접 물어보세요.
                </p>
                <SmithCaptainChat />
              </section>
            )}

            <section
              id="model-prediction"
              className="scroll-mt-28 rounded-2xl border border-border bg-card/50 p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold">모델 예측</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                전처리한 데이터를 사용해 머신러닝 분류 모델을 만들고, 승객별 생존
                가능성을 예측한 뒤 정확도와 해석 결과를 확인합니다.
              </p>
            </section>
          </div>
        </section>

        <aside className="lg:pt-20">
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Ship className="h-9 w-9" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Titanic</h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                1912년 침몰
                <br />
                1,500명 이상 사망
              </p>
            </div>
            <div className="mt-8 space-y-5">
              {stats.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

