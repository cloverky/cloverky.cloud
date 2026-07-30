"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Ctx = {
  register: () => () => void;
  showExtras: boolean;
};

const BottomRightExtrasCtx = createContext<Ctx>({
  register: () => () => {},
  showExtras: false,
});

export function BottomRightExtrasProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  // 매 렌더마다 새 객체를 넘기면 AppShell 이 다이얼로그를 열 때마다
  // 모든 소비자가 함께 리렌더된다 — 다른 Provider 들과 같이 값을 메모한다.
  const showExtras = count > 0;
  const value = useMemo(() => ({ register, showExtras }), [register, showExtras]);

  return (
    <BottomRightExtrasCtx.Provider value={value}>
      {children}
    </BottomRightExtrasCtx.Provider>
  );
}

export function useBottomRightExtras() {
  return useContext(BottomRightExtrasCtx);
}

export function BottomRightExtras() {
  const { register } = useContext(BottomRightExtrasCtx);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    const unregister = register();
    return () => {
      registered.current = false;
      unregister();
    };
  }, [register]);

  return null;
}
