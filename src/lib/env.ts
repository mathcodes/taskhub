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
