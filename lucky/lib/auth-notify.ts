import { toast } from "sonner";

/** 로그인·회원가입 성공 시 토스트 + 콘솔 로그 */
export function logLoginSuccess(username: string, email: string) {
  const message = `로그인 성공! ${username}님, 환영합니다.`;
  console.log("[FridgeAI Auth]", message, { username, email });
  toast.success("로그인 성공", { description: `${username}님, 환영합니다.` });
}

export function logSignUpSuccess(username: string, email: string, message?: string) {
  const text = message ?? `회원가입이 완료되었습니다. ${username}님, 이제 로그인해 주세요.`;
  console.log("[FridgeAI Auth] 회원가입 성공", { username, email, message: text });
  toast.success("회원가입 성공", { description: `${username}님, 이제 로그인해 주세요.` });
}
