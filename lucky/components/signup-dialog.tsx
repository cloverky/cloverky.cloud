"use client";

import { useState } from "react";
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
import { Refrigerator } from "lucide-react";
import { checkUsername, postSignUp } from "@/lib/auth-api";
import { logSignUpSuccess } from "@/lib/auth-notify";
import { cn } from "@/lib/utils";

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLogin?: (email?: string) => void;
}

type SignUpState = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  isLoading: boolean;
  isCheckingUsername: boolean;
  usernameChecked: boolean;
  usernameAvailable: boolean;
  usernameHint: string | null;
  error: string | null;
  success: boolean;
  successMessage: string | null;
};

const INITIAL_SIGNUP_STATE: SignUpState = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
  isLoading: false,
  isCheckingUsername: false,
  usernameChecked: false,
  usernameAvailable: false,
  usernameHint: null,
  error: null,
  success: false,
  successMessage: null,
};

export function SignUpDialog({ open, onOpenChange, onOpenLogin }: SignUpDialogProps) {
  const [form, setForm] = useState<SignUpState>(INITIAL_SIGNUP_STATE);

  const patchForm = (patch: Partial<SignUpState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const resetForm = () => setForm(INITIAL_SIGNUP_STATE);

  const resetUsernameCheck = () =>
    patchForm({
      usernameChecked: false,
      usernameAvailable: false,
      usernameHint: null,
    });

  const handleUsernameChange = (username: string) => {
    patchForm({ username });
    resetUsernameCheck();
  };

  const handleCheckUsername = async () => {
    const username = form.username.trim();
    if (username.length < 2) {
      patchForm({
        usernameHint: "아이디는 2자 이상 입력해 주세요.",
        usernameChecked: false,
        usernameAvailable: false,
      });
      return;
    }

    patchForm({ isCheckingUsername: true, error: null });
    try {
      const result = await checkUsername(username);
      patchForm({
        usernameChecked: true,
        usernameAvailable: result.available,
        usernameHint: result.message,
      });
    } catch (e) {
      resetUsernameCheck();
      patchForm({
        usernameHint: e instanceof Error ? e.message : "중복 확인에 실패했습니다.",
      });
    } finally {
      patchForm({ isCheckingUsername: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    patchForm({ error: null });

    const formData = new FormData(e.currentTarget);
    const formProps = Object.fromEntries(formData.entries()) as Record<string, string>;

    const name = String(formProps.name ?? "").trim();
    const username = String(formProps.username ?? "").trim();
    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");
    const confirmPassword = String(formProps.confirmPassword ?? "");
    const agreeTerms = formProps.agreeTerms === "on";

    if (!agreeTerms) {
      patchForm({ agreeTerms: false });
      return;
    }

    if (!form.usernameChecked || !form.usernameAvailable) {
      patchForm({ error: "아이디 중복 확인을 완료해 주세요." });
      return;
    }

    patchForm({
      name,
      username,
      email,
      password,
      confirmPassword,
      agreeTerms,
      isLoading: true,
      error: null,
    });
    try {
      const result = await postSignUp({
        name,
        username,
        email,
        password,
        confirmPassword,
        agreeTerms,
      });
      logSignUpSuccess(result.username, result.email, result.message);
      patchForm({
        success: true,
        successMessage: result.message,
        isLoading: false,
      });
    } catch (e) {
      patchForm({
        error: e instanceof Error ? e.message : "회원가입에 실패했습니다.",
      });
    } finally {
      patchForm({ isLoading: false });
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        {form.success ? (
          <div className="py-2 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Refrigerator className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-xl text-foreground">가입 완료</DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground">
              {form.successMessage ?? "회원가입이 완료되었습니다."}
            </DialogDescription>
            <p className="mt-3 text-sm text-muted-foreground">
              아래 버튼으로 로그인한 뒤 서비스를 이용해 주세요.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  const email = form.email.trim();
                  resetForm();
                  onOpenChange(false);
                  onOpenLogin?.(email || undefined);
                }}
              >
                로그인하기
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-border"
                onClick={() => handleDialogOpenChange(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Refrigerator className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-xl text-foreground">FridgeAI 회원가입</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            AI 기반 스마트 냉장고 관리 서비스를 시작하세요.
          </DialogDescription>
        </DialogHeader>

        <form
          id="signup-form"
          name="signup"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              이름
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="홍길동"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              required
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">
              아이디
            </Label>
            <div className="flex gap-2">
              <Input
                id="username"
                name="username"
                placeholder="영문, 숫자, _ (2~20자)"
                value={form.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                required
                minLength={2}
                maxLength={20}
                autoComplete="username"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-border"
                disabled={form.isCheckingUsername || !form.username.trim()}
                onClick={() => void handleCheckUsername()}
              >
                {form.isCheckingUsername ? "확인 중…" : "중복 확인 "}
              </Button>
            </div>
            {form.usernameHint && (
              <p
                className={cn(
                  "text-xs",
                  form.usernameAvailable ? "text-accent" : "text-muted-foreground",
                  form.usernameChecked && !form.usernameAvailable && "text-destructive",
                )}
              >
                {form.usernameHint}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              이메일
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => patchForm({ email: e.target.value })}
              required
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              비밀번호
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="8자 이상 입력"
              value={form.password}
              onChange={(e) => patchForm({ password: e.target.value })}
              required
              minLength={8}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              비밀번호 확인
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              value={form.confirmPassword}
              onChange={(e) => patchForm({ confirmPassword: e.target.value })}
              required
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-start gap-2">
            <input type="hidden" name="agreeTerms" value={form.agreeTerms ? "on" : "off"} />
            <Checkbox
              id="terms"
              checked={form.agreeTerms}
              onCheckedChange={(checked) => patchForm({ agreeTerms: checked === true })}
              required
              className="mt-1 border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
              <a href="#" className="text-foreground underline hover:text-accent">
                서비스 이용약관
              </a>{" "}
              및{" "}
              <a href="#" className="text-foreground underline hover:text-accent">
                개인정보 처리방침
              </a>
              에 동의합니다.
            </Label>
          </div>

          {form.error && (
            <p className="text-sm text-destructive" role="alert">
              {form.error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={
              form.isLoading ||
              !form.agreeTerms ||
              !form.usernameChecked ||
              !form.usernameAvailable
            }
          >
            {form.isLoading ? "처리 중..." : "가입하기"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              className="text-foreground underline hover:text-accent"
              onClick={() => {
                onOpenChange(false);
                onOpenLogin?.();
              }}
            >
              로그인
            </button>
          </p>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
