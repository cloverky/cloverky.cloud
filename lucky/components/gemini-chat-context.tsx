"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export function nextChatId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function scrollChatLists(
  a: React.RefObject<HTMLDivElement | null>,
  b: React.RefObject<HTMLDivElement | null>,
) {
  requestAnimationFrame(() => {
    for (const ref of [a, b]) {
      const el = ref.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  });
}

type ChatState = {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
};

const INITIAL_CHAT: ChatState = {
  messages: [],
  input: "",
  loading: false,
  error: null,
};

type GeminiChatContextValue = {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  messagesRef: React.MutableRefObject<ChatMessage[]>;
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  dialogListRef: React.MutableRefObject<HTMLDivElement | null>;
  floatingListRef: React.MutableRefObject<HTMLDivElement | null>;
};

const GeminiChatContext = createContext<GeminiChatContextValue | null>(null);

export function GeminiChatProvider({ children }: { children: React.ReactNode }) {
  const [chat, setChat] = useState<ChatState>(INITIAL_CHAT);
  const messagesRef = useRef<ChatMessage[]>([]);
  const dialogListRef = useRef<HTMLDivElement | null>(null);
  const floatingListRef = useRef<HTMLDivElement | null>(null);

  const patchChat = useCallback(
    (patch: Partial<ChatState>) => setChat((prev) => ({ ...prev, ...patch })),
    [],
  );

  const setMessages = useCallback((action: SetStateAction<ChatMessage[]>) => {
    setChat((prev) => ({
      ...prev,
      messages: typeof action === "function" ? action(prev.messages) : action,
    }));
  }, []);

  const setInput = useCallback((v: string) => patchChat({ input: v }), [patchChat]);

  const setLoading = useCallback(
    (action: SetStateAction<boolean>) => {
      setChat((prev) => ({
        ...prev,
        loading: typeof action === "function" ? action(prev.loading) : action,
      }));
    },
    [],
  );

  const setError = useCallback(
    (action: SetStateAction<string | null>) => {
      setChat((prev) => ({
        ...prev,
        error: typeof action === "function" ? action(prev.error) : action,
      }));
    },
    [],
  );

  useEffect(() => {
    messagesRef.current = chat.messages;
  }, [chat.messages]);

  const value = useMemo(
    () => ({
      messages: chat.messages,
      setMessages,
      messagesRef,
      input: chat.input,
      setInput,
      loading: chat.loading,
      setLoading,
      error: chat.error,
      setError,
      dialogListRef,
      floatingListRef,
    }),
    [chat.messages, chat.input, chat.loading, chat.error, setMessages, setInput, setLoading, setError],
  );

  return <GeminiChatContext.Provider value={value}>{children}</GeminiChatContext.Provider>;
}

export function useGeminiChat() {
  const ctx = useContext(GeminiChatContext);
  if (!ctx) {
    throw new Error("useGeminiChat must be used within GeminiChatProvider");
  }
  return ctx;
}
