import { toast } from "sonner";

/** 로그인·회원가입 성공 시 토스트 표시 */
export function logLoginSuccess(username: string, _email: string) {
  toast.success("로그인 성공", { description: `${username}님, 환영합니다.` });
}

export function logSignUpSuccess(username: string, _email: string, message?: string) {
  toast.success("회원가입 성공", {
    description: message ?? `${username}님, 이제 로그인해 주세요.`,
  });
}
