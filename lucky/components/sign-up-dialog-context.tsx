"use client";

import { createContext, useContext } from "react";

export type SignUpPrefill = {
  email?: string;
  name?: string;
  /** 회원가입 모달 상단에 띄울 안내 — 미가입 소셜 로그인에서 넘어온 경우 등. */
  notice?: string;
};

const OpenSignUpContext = createContext<((prefill?: SignUpPrefill) => void) | null>(
  null,
);

export function OpenSignUpProvider({
  open,
  children,
}: {
  open: (prefill?: SignUpPrefill) => void;
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
