/**
 * Parse JSON from a fetch Response. Surfaces clear errors when the body is empty
 * or not JSON (common with proxy/502 pages or crashed routes).
 */
export async function readJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty response from server (${res.status} ${res.statusText}). The route may have failed without a body.`
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Server returned non-JSON (${res.status}): ${trimmed.slice(0, 280)}${trimmed.length > 280 ? "…" : ""}`
    );
  }
}
