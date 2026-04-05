"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "taskhub_user_openai_key";

export const OPENAI_USER_KEY_HEADER = "X-OpenAI-Key";

type Ctx = {
  /** User-supplied key from localStorage, or null if cleared / unavailable */
  apiKey: string | null;
  /** False until localStorage has been read (avoid SSR mismatch) */
  ready: boolean;
  setApiKey: (value: string) => void;
  clearApiKey: () => void;
};

const UserOpenAIKeyContext = createContext<Ctx | null>(null);

export function UserOpenAIKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)?.trim();
      setApiKeyState(v || null);
    } catch {
      /* private / blocked storage */
    }
    setReady(true);
  }, []);

  const setApiKey = useCallback((value: string) => {
    const t = value.trim();
    try {
      if (t) localStorage.setItem(STORAGE_KEY, t);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setApiKeyState(t || null);
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setApiKeyState(null);
  }, []);

  const value = useMemo(
    () => ({ apiKey, ready, setApiKey, clearApiKey }),
    [apiKey, ready, setApiKey, clearApiKey]
  );

  return (
    <UserOpenAIKeyContext.Provider value={value}>{children}</UserOpenAIKeyContext.Provider>
  );
}

export function useUserOpenAIKey(): Ctx {
  const c = useContext(UserOpenAIKeyContext);
  if (!c) {
    throw new Error("useUserOpenAIKey must be used within UserOpenAIKeyProvider");
  }
  return c;
}

/** Merge into fetch headers so API routes can use BYOK via `resolveOpenAIKeyFromRequest`. */
export function useOpenAIFetchHeaders(): () => Record<string, string> {
  const { apiKey } = useUserOpenAIKey();
  return useCallback(() => {
    const h: Record<string, string> = {};
    if (apiKey?.trim()) {
      h[OPENAI_USER_KEY_HEADER] = apiKey.trim();
    }
    return h;
  }, [apiKey]);
}
