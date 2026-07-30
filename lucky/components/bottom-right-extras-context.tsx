"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  return (
    <BottomRightExtrasCtx.Provider value={{ register, showExtras: count > 0 }}>
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
