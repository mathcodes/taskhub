import { getAnthropicApiKey } from "@/lib/env";

/** Header the client sends so public deployments can use per-user Anthropic keys (BYOK). */
export const ANTHROPIC_USER_KEY_HEADER = "x-anthropic-key";

/** Prefer a key supplied on the request (BYOK), otherwise fall back to the server env. */
export function resolveAnthropicKeyFromRequest(req: Request): string | undefined {
  const fromHeader = req.headers.get(ANTHROPIC_USER_KEY_HEADER)?.trim();
  if (fromHeader && fromHeader.startsWith("sk-ant-") && fromHeader.length < 300) return fromHeader;
  return getAnthropicApiKey();
}
