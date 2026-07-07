"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "h-9 w-9 shrink-0 border-border bg-card/80 text-foreground backdrop-blur-sm",
        "hover:bg-accent/10 hover:text-accent",
        className,
      )}
      aria-label={mounted ? (isDark ? "라이트 모드로 전환" : "다크 모드로 전환") : "테마 전환"}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />
      ) : (
        <span className="h-4 w-4" />
      )}
    </Button>
  );
}
