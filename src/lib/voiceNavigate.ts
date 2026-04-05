/** Allowed in-app paths for voice-triggered navigation (no query strings). */
const ALLOWED = new Set(["/", "/taskhub", "/p21"]);

/**
 * Returns a safe internal path or null if the model output should be ignored.
 */
export function normalizeVoiceNavigatePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  const pathOnly = t.split("?")[0]?.split("#")[0] ?? "";
  if (!ALLOWED.has(pathOnly)) return null;
  return pathOnly;
}
