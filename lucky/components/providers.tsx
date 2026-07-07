"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="fridgeai-theme">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
