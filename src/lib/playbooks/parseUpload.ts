export type PlaybookUploadV1 = {
  version?: number;
  title: string;
  department?: string;
  steps: { text: string }[];
};

export type ParsedPlaybookUpload = {
  title: string;
  department: string | null;
  steps: { text: string }[];
};

export function parsePlaybookUploadJson(raw: string): ParsedPlaybookUpload {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Upload must be valid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Upload must be a JSON object");
  const o = data as Record<string, unknown>;

  if (o.version !== undefined && o.version !== 1) {
    throw new Error(`Unsupported version: ${String(o.version)} (expected 1)`);
  }

  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) throw new Error('Missing or empty "title"');

  const department =
    typeof o.department === "string" && o.department.trim() ? o.department.trim() : null;

  if (!Array.isArray(o.steps) || o.steps.length === 0) {
    throw new Error('"steps" must be a non-empty array');
  }

  const steps: { text: string }[] = [];
  for (const s of o.steps) {
    if (!s || typeof s !== "object") throw new Error("Each step must be an object");
    const t = typeof (s as { text?: unknown }).text === "string" ? (s as { text: string }).text.trim() : "";
    if (!t) throw new Error("Each step must have non-empty text");
    steps.push({ text: t });
  }

  return { title, department, steps };
}
