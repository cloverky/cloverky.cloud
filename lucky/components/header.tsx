"use client";

import { useState } from "react";
import Link from "next/link";
import { Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderMobileNav } from "@/components/header-mobile-nav";
import { FridgeGame } from "@/components/fridge-game";

interface HeaderProps {
  onSignUpClick: () => void;
  onLoginClick: () => void;
  onProfileEditClick: () => void;
}

export function Header({ onSignUpClick, onLoginClick, onProfileEditClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [gameOpen, setGameOpen] = useState(false);
  const [gameOrigin, setGameOrigin] = useState<{ x: number; y: number } | undefined>();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="relative flex w-full items-center justify-between gap-4 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <HeaderMobileNav
            user={user}
            onLoginClick={onLoginClick}
            onSignUpClick={onSignUpClick}
            onProfileEditClick={onProfileEditClick}
            onLogout={logout}
          />
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setGameOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                setGameOpen(true);
              }}
              className="shrink-0 rounded p-0.5 hover:opacity-70 transition-opacity"
            >
              <Refrigerator className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
            </button>
            <Link href="/" className="truncate text-lg font-bold text-foreground max-md:max-w-[7.5rem] sm:max-w-none sm:text-xl">
              FridgeAI
            </Link>
          </div>
          {gameOpen && <FridgeGame onClose={() => setGameOpen(false)} origin={gameOrigin} />}
        </div>

        <div className="relative z-10 ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border bg-transparent px-3 text-sm text-foreground hover:bg-secondary"
            asChild
          >
            <Link href="/lesson">lesson</Link>
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
                {user.username}님
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-border bg-transparent px-4 text-sm text-foreground hover:bg-secondary"
                onClick={logout}
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <>
              <form className="inline" onSubmit={(e) => { e.preventDefault(); onLoginClick(); }}>
                <Button type="submit" variant="outline" size="sm" className="h-9 border-border bg-transparent px-4 text-sm text-foreground hover:bg-secondary">
                  로그인
                </Button>
              </form>
              <form className="inline" onSubmit={(e) => { e.preventDefault(); onSignUpClick(); }}>
                <Button type="submit" size="sm" className="h-9 bg-foreground px-4 text-sm text-background hover:bg-foreground/90">
                  회원가입
                </Button>
              </form>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border bg-transparent px-3 text-sm text-foreground hover:bg-secondary"
            asChild
          >
            <Link href="/admin">admin</Link>
          </Button>

          <ThemeToggle className="h-9 w-9 shadow-sm" />
        </div>
      </div>
    </header>
  );
}
