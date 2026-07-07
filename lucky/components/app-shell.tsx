"use client";

import { useCallback, useState } from "react";
import { AuthProvider } from "@/components/auth-context";
import { GeminiChatProvider } from "@/components/gemini-chat-context";
import { Header } from "@/components/header";
import { OpenLoginProvider } from "@/components/login-dialog-context";
import { LoginDialog } from "@/components/login-dialog";
import { OpenSignUpProvider } from "@/components/sign-up-dialog-context";
import { SignUpDialog } from "@/components/signup-dialog";

type AuthDialogsState = {
  signUpOpen: boolean;
  loginOpen: boolean;
  loginPrefillEmail: string;
};

const INITIAL_AUTH_DIALOGS: AuthDialogsState = {
  signUpOpen: false,
  loginOpen: false,
  loginPrefillEmail: "",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<AuthDialogsState>(INITIAL_AUTH_DIALOGS);

  const patchDialogs = (patch: Partial<AuthDialogsState>) =>
    setDialogs((prev) => ({ ...prev, ...patch }));

  const openSignUp = useCallback(() => patchDialogs({ signUpOpen: true }), []);
  const openLogin = useCallback(
    () => patchDialogs({ loginOpen: true, loginPrefillEmail: "" }),
    [],
  );

  return (
    <AuthProvider>
      <OpenSignUpProvider open={openSignUp}>
        <OpenLoginProvider open={openLogin}>
          <GeminiChatProvider>
            <Header onSignUpClick={openSignUp} onLoginClick={openLogin} />
            {children}
            <SignUpDialog
              open={dialogs.signUpOpen}
              onOpenChange={(signUpOpen) => patchDialogs({ signUpOpen })}
              onOpenLogin={(email) => {
                patchDialogs({
                  signUpOpen: false,
                  loginPrefillEmail: email ?? "",
                  loginOpen: true,
                });
              }}
            />
            <LoginDialog
              open={dialogs.loginOpen}
              onOpenChange={(loginOpen) => patchDialogs({ loginOpen })}
              initialEmail={dialogs.loginPrefillEmail}
            />
          </GeminiChatProvider>
        </OpenLoginProvider>
      </OpenSignUpProvider>
    </AuthProvider>
  );
}
