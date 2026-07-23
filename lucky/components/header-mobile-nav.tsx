"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { HEADER_NAV_MENUS } from "@/lib/header-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type HeaderMobileNavProps = {
  user: { username: string } | null;
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onProfileEditClick: () => void;
  onLogout: () => void;
};

export function HeaderMobileNav({
  user,
  onLoginClick,
  onSignUpClick,
  onProfileEditClick,
  onLogout,
}: HeaderMobileNavProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleLogin = () => {
    close();
    onLoginClick();
  };

  const handleSignUp = () => {
    close();
    onSignUpClick();
  };

  const handleProfileEdit = () => {
    close();
    onProfileEditClick();
  };

  const handleLogout = () => {
    close();
    onLogout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[min(80vw,22rem)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="text-base">메뉴</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="주요 메뉴">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            기능
          </p>
          <ul className="space-y-0.5">
            {HEADER_NAV_MENUS[0]?.items.map((item) => (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 transition-colors",
                    "hover:bg-accent/12 hover:text-accent",
                    "focus-visible:bg-accent/12 focus-visible:outline-none",
                  )}
                >
                  <span className="block text-base font-semibold text-foreground">{item.label}</span>
                  {item.description && (
                    <span className="mt-0.5 block text-sm text-muted-foreground">{item.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto space-y-3 border-t border-border px-4 py-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <span className="text-base font-medium text-foreground">화면 테마</span>
            <ThemeToggle className="h-10 w-10 shadow-sm" />
          </div>
          <Button variant="outline" className="h-12 w-full text-base" asChild>
            <Link href="/lesson" onClick={close}>
              lesson
            </Link>
          </Button>
          <Button variant="outline" className="h-12 w-full text-base" asChild>
            <Link href="/admin" onClick={close}>
              admin
            </Link>
          </Button>
          {user ? (
            <>
              <p className="px-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{user.username}</span>님
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={handleProfileEdit}
              >
                내 정보 수정
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={handleLogout}
              >
                로그아웃
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={handleLogin}>
                로그인
              </Button>
              <Button type="button" className="h-12 w-full text-base" onClick={handleSignUp}>
                회원가입
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
