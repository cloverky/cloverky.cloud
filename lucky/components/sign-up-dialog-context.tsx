"use client";

import { createContext, useContext } from "react";

const OpenSignUpContext = createContext<(() => void) | null>(null);

export function OpenSignUpProvider({
  open,
  children,
}: {
  open: () => void;
  children: React.ReactNode;
}) {
  return (
    <OpenSignUpContext.Provider value={open}>{children}</OpenSignUpContext.Provider>
  );
}

export function useOpenSignUp() {
  const ctx = useContext(OpenSignUpContext);
  return ctx ?? (() => {});
}
