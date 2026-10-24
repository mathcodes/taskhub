"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Bring-your-own-key (BYOK) store for the public demo.
 * Keys live only in this browser's localStorage and are attached as request
 * headers so API routes can call OpenAI / Anthropic on the visitor's account.
 */
const OPENAI_STORAGE_KEY = "taskhub_user_openai_key";
const ANTHROPIC_STORAGE_KEY = "taskhub_user_anthropic_key";

export const OPENAI_USER_KEY_HEADER = "X-OpenAI-Key";
export const ANTHROPIC_USER_KEY_HEADER = "X-Anthropic-Key";

type Ctx = {
  /** User-supplied OpenAI key, or null if not set */
  apiKey: string | null;
  /** User-supplied Anthropic key, or null if not set */
  anthropicKey: string | null;
  /** False until localStorage has been read (avoid SSR mismatch) */
  ready: boolean;
  setApiKey: (value: string) => void;
  clearApiKey: () => void;
  setAnthropicKey: (value: string) => void;
  clearAnthropicKey: () => void;
};

const UserOpenAIKeyContext = createContext<Ctx | null>(null);

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)?.trim() || null;
  } catch {
    return null; // private mode / blocked storage
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* blocked storage: key stays in memory for this tab */
  }
}

export function UserOpenAIKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKeyState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate from storage after mount; deferred so the first client render matches SSR.
    const id = window.setTimeout(() => {
      setApiKeyState(readStored(OPENAI_STORAGE_KEY));
      setAnthropicKeyState(readStored(ANTHROPIC_STORAGE_KEY));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setApiKey = useCallback((value: string) => {
    const t = value.trim() || null;
    writeStored(OPENAI_STORAGE_KEY, t);
    setApiKeyState(t);
  }, []);

  const clearApiKey = useCallback(() => setApiKey(""), [setApiKey]);

  const setAnthropicKey = useCallback((value: string) => {
    const t = value.trim() || null;
    writeStored(ANTHROPIC_STORAGE_KEY, t);
    setAnthropicKeyState(t);
  }, []);

  const clearAnthropicKey = useCallback(() => setAnthropicKey(""), [setAnthropicKey]);

  const value = useMemo(
    () => ({ apiKey, anthropicKey, ready, setApiKey, clearApiKey, setAnthropicKey, clearAnthropicKey }),
    [apiKey, anthropicKey, ready, setApiKey, clearApiKey, setAnthropicKey, clearAnthropicKey]
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

/** Merge into fetch headers so API routes can use BYOK for OpenAI and Anthropic. */
export function useOpenAIFetchHeaders(): () => Record<string, string> {
  const { apiKey, anthropicKey } = useUserOpenAIKey();
  return useCallback(() => {
    const h: Record<string, string> = {};
    if (apiKey?.trim()) h[OPENAI_USER_KEY_HEADER] = apiKey.trim();
    if (anthropicKey?.trim()) h[ANTHROPIC_USER_KEY_HEADER] = anthropicKey.trim();
    return h;
  }, [apiKey, anthropicKey]);
}
