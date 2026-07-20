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
      <DialogContent className="border-border bg-card sm:max-w-md flex flex-col max-h-[90vh]">
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
          className="mt-4 space-y-4 overflow-y-auto pr-1"
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
        <div className='mt-2'>
          <div className='relative my-3 flex items-center gap-3'>
            <div className='h-px flex-1 bg-border' />
            <span className='text-xs text-muted-foreground'>또는</span>
            <div className='h-px flex-1 bg-border' />
          </div>
          <div className='flex justify-center gap-3'>
            <button type='button' onClick={() => { const b = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cloverky.cloud'; onOpenChange(false); window.location.href = b+'/auth/kakao'; }} className='flex h-12 w-12 items-center justify-center rounded-xl transition hover:opacity-80' style={{backgroundColor:'#FEE500'}} aria-label='카카오 로그인'><svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.08 4.03 6.54L5 21l4.47-2.4c.83.17 1.67.26 2.53.26 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z' fill='#000000'/></svg></button>
            <button type='button' onClick={() => { const b = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cloverky.cloud'; onOpenChange(false); window.location.href = b+'/auth/naver'; }} className='flex h-12 w-12 items-center justify-center rounded-xl transition hover:opacity-80' style={{backgroundColor:'#03CF5D'}} aria-label='네이버 로그인'><svg width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M13.5 12.6L10.2 7H7v10h3.5V11.4L14 17H17V7h-3.5z'/></svg></button>
            <button type='button' onClick={() => { const b = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cloverky.cloud'; onOpenChange(false); window.location.href = b+'/auth/apple'; }} className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary transition hover:opacity-80' aria-label='애플 로그인'><svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'><path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'/></svg></button>
            <button type='button' onClick={() => { const b = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cloverky.cloud'; onOpenChange(false); window.location.href = b+'/auth/google'; }} className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary transition hover:opacity-80' aria-label='구글 로그인'><svg width='20' height='20' viewBox='0 0 24 24'><path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/><path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/><path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05'/><path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/></svg></button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
