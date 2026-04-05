import { getOpenAIKey } from "@/lib/env";

/** Client sends this header so public deployments can use per-user keys (BYOK). */
export const OPENAI_USER_KEY_HEADER = "x-openai-key";

function normalizeUserKey(value: string | null): string | undefined {
  const t = value?.trim();
  if (!t || t.length < 8) return undefined;
  return t;
}

/**
 * Prefer a key supplied on the request (BYOK), otherwise fall back to server env.
 */
export function resolveOpenAIKeyFromRequest(req: Request): string | undefined {
  const fromHeader = normalizeUserKey(req.headers.get(OPENAI_USER_KEY_HEADER));
  if (fromHeader) return fromHeader;
  return getOpenAIKey();
}
