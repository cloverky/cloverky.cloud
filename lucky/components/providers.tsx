"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // sonner 는 Esc 로 토스트를 닫지 않아서 직접 연결
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toast.dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="fridgeai-theme">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
