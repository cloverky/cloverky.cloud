"use client";

import { Button } from "@/components/ui/button";
import { BottomRightStack } from "@/components/bottom-right-stack";
import { useOpenSignUp } from "@/components/sign-up-dialog-context";
import { ArrowRight, ChefHat, Package } from "lucide-react";
import { CloverIcon } from "@/components/clover-icon";

export function HeroSection() {
  const onSignUpClick = useOpenSignUp();
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-x-hidden pb-8 md:pb-20">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-accent/20 blur-[120px]" />
      
      {/* Floating icons background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 opacity-10">
          <Package className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="absolute top-1/3 right-1/3 opacity-10">
          <ChefHat className="h-20 w-20 text-muted-foreground" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 opacity-10">
          <CloverIcon className="h-14 w-14 text-muted-foreground" />
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex flex-1 flex-col justify-center pt-20 sm:pt-24 md:flex-none md:justify-start md:pt-[7.75rem] lg:pt-[8.75rem]">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center">
            <p className="font-display mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.07] px-4 py-2 text-[0.95rem] text-brand-text shadow-sm">
              <CloverIcon className="h-4 w-4 text-accent" strokeWidth={2.5} />
              당신만의 냉장고 도우미
            </p>
            <h1 className="font-display text-balance text-[3.75rem] leading-[1.15] tracking-normal text-foreground antialiased sm:text-[3.25rem] md:text-6xl lg:text-[4.75rem] lg:leading-[1.12]">
              <span className="block text-foreground/55">
                똑똑한 <span className="text-brand-text">AI</span>로
              </span>
              <span className="mt-1 block text-foreground">
                <span className="relative inline-block">
                  <span className="relative z-10">냉장고</span>
                  <span
                    className="absolute -inset-x-1 bottom-2 z-0 h-[0.38em] rounded-full bg-accent/25"
                    aria-hidden
                  />
                </span>
                를
              </span>
              <span className="mt-1 block text-brand-text">더 스마트하게.</span>
            </h1>
            <p className="mt-8 max-w-md break-keep text-[0.875rem] leading-[1.95] text-foreground/80 sm:max-w-lg sm:text-lg sm:leading-[1.85] md:mt-7 md:text-muted-foreground">
              FridgeAI는 여러 AI가 함께 도와
              <br />
              냉장고 재고를 실시간으로 관리하고,
              <br />
              개인의 취향과 보유 식재료에 맞는
              <br />
              맞춤형 레시피를 추천합니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                onClick={onSignUpClick}
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                시작하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-border bg-transparent text-foreground hover:bg-secondary"
              >
                문서 보기 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative hidden items-center justify-center lg:mt-5 lg:flex">
            {/* Agent visualization — 데스크톱만 */}
            <div className="relative h-[400px] w-full max-w-[400px] lg:h-[500px] lg:max-w-[500px]">
              {/* Central hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card shadow-lg">
                  <CloverIcon className="h-10 w-10 text-accent" />
                </div>
              </div>
              
              {/* Orbiting agents */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-pulse">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                  <Package className="h-6 w-6 text-foreground" />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">재고 도우미</p>
              </div>
              
              <div className="absolute right-0 top-1/2 -translate-y-1/2 animate-pulse [animation-delay:0.5s]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                  <ChefHat className="h-6 w-6 text-foreground" />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">레시피 도우미</p>
              </div>
              
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-pulse [animation-delay:1s]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                  <svg className="h-6 w-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">장보기 도우미</p>
              </div>
              
              <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-pulse [animation-delay:1.5s]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                  <svg className="h-6 w-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">알림 도우미</p>
              </div>

              {/* Connection lines */}
              <svg className="absolute inset-0 h-full w-full" style={{ zIndex: -1 }}>
                <line x1="50%" y1="20%" x2="50%" y2="40%" stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="4" />
                <line x1="80%" y1="50%" x2="60%" y2="50%" stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="4" />
                <line x1="50%" y1="80%" x2="50%" y2="60%" stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="4" />
                <line x1="20%" y1="50%" x2="40%" y2="50%" stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="4" />
              </svg>
            </div>
          </div>
        </div>
        </div>
      </div>

      <BottomRightStack />
    </section>
  );
}
