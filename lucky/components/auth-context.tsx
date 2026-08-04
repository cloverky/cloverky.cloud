"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { SESSION_EXPIRED_EVENT } from "@/lib/auth-session";

const STORAGE_KEY = "fridgeai-auth";

export type AuthUser = {
  username: string;
  name: string;
  email: string;
  /** "admin" 이면 관리자 전용 UI가 보인다. 서버가 안 내려주면 일반 사용자로 본다. */
  role: string;
};

export const ADMIN_ROLE = "admin";

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === ADMIN_ROLE;
}

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  login: (user: AuthUser, remember?: boolean) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
};

type AuthState = {
  user: AuthUser | null;
  isReady: boolean;
};

const INITIAL_AUTH: AuthState = {
  user: null,
  isReady: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const u = value as AuthUser;
  return Boolean(u.username && u.email);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(INITIAL_AUTH);

  const patchAuth = (patch: Partial<AuthState>) =>
    setAuth((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isAuthUser(parsed)) {
          // sessionStorage는 SSR에서 접근 불가 — 마운트 후 세션 복원이 필수다.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          patchAuth({
            user: {
              username: parsed.username,
              name: parsed.name ?? parsed.username,
              email: parsed.email,
              // role 없이 저장된 옛 세션은 일반 사용자로 복원한다.
              role: parsed.role ?? "user",
            },
          });
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    patchAuth({ isReady: true });
  }, []);

  const login = useCallback((next: AuthUser, _remember = false) => {
    patchAuth({ user: next });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    patchAuth({ user: null });
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    // 여기 로그인 상태는 sessionStorage라 만료가 없다. 실제 자격증명인
    // access_token 쿠키가 죽으면 API가 알려 주고, 그때 화면도 같이 내린다.
    if (!auth.user) return;
    const onExpired = () => {
      logout();
      toast.error("세션이 만료되었습니다", {
        description: "다시 로그인해 주세요.",
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [auth.user, logout]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setAuth((prev) => {
      if (!prev.user) return prev;
      const next = { ...prev.user, ...patch };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { ...prev, user: next };
    });
  }, []);

  const value = useMemo(
    () => ({
      user: auth.user,
      isReady: auth.isReady,
      login,
      updateUser,
      logout,
    }),
    [auth.user, auth.isReady, login, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
