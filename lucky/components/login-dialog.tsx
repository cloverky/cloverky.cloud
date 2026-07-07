"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Refrigerator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/auth-context";
import { useOpenSignUp } from "@/components/sign-up-dialog-context";
import { postLogin } from "@/lib/auth-api";
import { logLoginSuccess } from "@/lib/auth-notify";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

type LoginFormState = {
  email: string;
  password: string;
  remember: boolean;
  isLoading: boolean;
  slowHint: boolean;
  error: string | null;
};

const INITIAL_FORM_STATE: LoginFormState = {
  email: "",
  password: "",
  remember: false,
  isLoading: false,
  slowHint: false,
  error: null,
};

const SLOW_HINT_DELAY_MS = 3_000;

export function LoginDialog({ open, onOpenChange, initialEmail = "" }: LoginDialogProps) {
  const { login: authLogin } = useAuth();
  const openSignUp = useOpenSignUp();
  const [form, setForm] = useState<LoginFormState>(INITIAL_FORM_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlowHintTimer = () => {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
      slowHintTimerRef.current = null;
    }
  };

  const abortLogin = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const resetForm = () => {
    clearSlowHintTimer();
    abortLogin();
    setForm(INITIAL_FORM_STATE);
  };

  const patchForm = (patch: Partial<LoginFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (open && initialEmail) {
      patchForm({ email: initialEmail });
    }
  }, [open, initialEmail]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formProps = Object.fromEntries(formData.entries()) as Record<string, string>;

    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");
    const remember = formProps.remember === "on";

    abortLogin();
    const controller = new AbortController();
    abortRef.current = controller;

    patchForm({ email, password, remember, isLoading: true, slowHint: false, error: null });
    clearSlowHintTimer();
    slowHintTimerRef.current = setTimeout(() => {
      setForm((prev) => (prev.isLoading ? { ...prev, slowHint: true } : prev));
    }, SLOW_HINT_DELAY_MS);

    try {
      if (password.length < 8) {
        patchForm({ error: "비밀번호는 8자 이상이어야 합니다.", isLoading: false });
        return;
      }

      const result = await postLogin({ email, password, remember }, controller.signal);

      authLogin(
        {
          username: result.username,
          name: result.name,
          email: result.email,
        },
        remember,
      );
      logLoginSuccess(result.username, result.email);
      onOpenChange(false);
      resetForm();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.";
      if (message !== "로그인이 취소되었습니다.") {
        patchForm({ error: message });
      }
    } finally {
      clearSlowHintTimer();
      abortRef.current = null;
      setForm((prev) => ({ ...prev, isLoading: false, slowHint: false }));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Refrigerator className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-xl text-foreground">FridgeAI 로그인</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            계정으로 로그인하고 스마트 냉장고 서비스를 이용하세요.
          </DialogDescription>
        </DialogHeader>

        <form
          id="login-form"
          name="login"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-foreground">
              이메일
            </Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => patchForm({ email: e.target.value })}
              required
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-foreground">
                비밀번호
              </Label>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                비밀번호 찾기
              </button>
            </div>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={form.password}
              onChange={(e) => patchForm({ password: e.target.value })}
              required
              minLength={8}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="hidden" name="remember" value={form.remember ? "on" : "off"} />
            <Checkbox
              id="remember"
              checked={form.remember}
              onCheckedChange={(checked) => patchForm({ remember: checked === true })}
              className="border-border data-[state=checked]:border-accent data-[state=checked]:bg-accent"
            />
            <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
              로그인 상태 유지
            </Label>
          </div>

          {form.slowHint && form.isLoading && !form.error && (
            <p className="text-sm text-muted-foreground" role="status">
              서버 응답이 느립니다. 잠시만 기다리거나 창을 닫아 취소할 수 있습니다.
            </p>
          )}

          {form.error && (
            <p className="text-sm text-destructive" role="alert">
              {form.error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={form.isLoading}
          >
            {form.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중…
              </>
            ) : (
              "로그인"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <button
              type="button"
              className="text-foreground underline hover:text-accent"
              onClick={() => {
                onOpenChange(false);
                openSignUp();
              }}
            >
              회원가입
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
