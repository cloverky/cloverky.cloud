"use client";

import { createContext, useContext } from "react";

const OpenLoginContext = createContext<(() => void) | null>(null);

export function OpenLoginProvider({
  open,
  children,
}: {
  open: () => void;
  children: React.ReactNode;
}) {
  return <OpenLoginContext.Provider value={open}>{children}</OpenLoginContext.Provider>;
}

export function useOpenLogin() {
  const ctx = useContext(OpenLoginContext);
  return ctx ?? (() => {});
}
