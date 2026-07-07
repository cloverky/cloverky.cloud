"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "fridgeai-auth";

export type AuthUser = {
  username: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  login: (user: AuthUser, remember?: boolean) => void;
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
          patchAuth({
            user: {
              username: parsed.username,
              name: parsed.name ?? parsed.username,
              email: parsed.email,
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

  const value = useMemo(
    () => ({
      user: auth.user,
      isReady: auth.isReady,
      login,
      logout,
    }),
    [auth.user, auth.isReady, login, logout],
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
