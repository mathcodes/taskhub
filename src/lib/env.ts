export function getTaskHubTimezone(): string {
  return process.env.TASKHUB_TIMEZONE?.trim() || "UTC";
}

export function getAlertHoursBeforeDue(): number {
  const n = Number(process.env.TASKHUB_ALERT_HOURS_BEFORE ?? "2");
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export function getOpenAIKey(): string | undefined {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k || undefined;
}

export function getOpenAIChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

/** Anthropic API key for multi-agent assessment (server-side only). */
export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
}

/**
 * Public URL for links in emails/SMS (no trailing slash).
 * Prefer NEXT_PUBLIC_APP_URL; on Vercel, VERCEL_URL is set (no scheme).
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
