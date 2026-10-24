/**
 * Deterministic date/time display for React SSR + browser hydration.
 * Avoids `Date#toLocaleString()` (locale/timezone can differ between Node and the client).
 */
export function formatIsoDateTimeUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d) + " UTC";
}
