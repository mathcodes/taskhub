import { readFileSync, existsSync } from "fs";
import { join } from "path";

const JSON_REL = ["docs", "p21", "training", "boss", "examples", "rules.examples.json"];

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "that",
  "this",
  "it",
  "we",
  "you",
  "our",
  "all",
  "any",
  "no",
  "not",
  "can",
  "how",
  "what",
  "when",
  "where",
  "which",
  "who",
  "show",
  "list",
  "get",
  "find",
  "me",
  "my",
  "rule",
  "rules",
]);

export type BossRuleExample = {
  id?: string;
  userPrompt: string;
  tags?: string[];
  outline?: string;
  p21Notes?: string;
};

let cached: BossRuleExample[] | null = null;

export function getBossExamplesPath(): string {
  return join(process.cwd(), ...JSON_REL);
}

export function loadBossExamples(): BossRuleExample[] {
  if (cached) return cached;
  const p = getBossExamplesPath();
  if (!existsSync(p)) {
    cached = [];
    return cached;
  }
  const raw = readFileSync(p, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${p}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${p} must be a JSON array`);
  const out: BossRuleExample[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const userPrompt = typeof o.userPrompt === "string" ? o.userPrompt.trim() : "";
    if (!userPrompt) continue;
    const id = typeof o.id === "string" ? o.id.trim() : undefined;
    const tags = Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : undefined;
    const outline = typeof o.outline === "string" ? o.outline.trim() : undefined;
    const p21Notes = typeof o.p21Notes === "string" ? o.p21Notes.trim() : undefined;
    out.push({ id, userPrompt, tags, outline, p21Notes });
  }
  cached = out;
  return cached;
}

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function scoreExample(ex: BossRuleExample, words: string[]): number {
  const tagStr = (ex.tags ?? []).join(" ");
  const hay = `${ex.userPrompt} ${tagStr} ${ex.outline ?? ""} ${ex.p21Notes ?? ""}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (hay.includes(w)) s += 1;
  }
  return s;
}

export function retrieveBossExamples(
  userQuestion: string,
  options?: { max?: number }
): { markdown: string; ids: string[]; count: number } {
  const examples = loadBossExamples();
  const max = options?.max ?? 6;
  const words = tokenizeQuery(userQuestion);
  if (examples.length === 0 || words.length === 0) {
    return { markdown: "", ids: [], count: 0 };
  }

  const scored = examples
    .map((ex, i) => ({ ex, i, s: scoreExample(ex, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max);

  if (scored.length === 0) {
    return { markdown: "", ids: [], count: 0 };
  }

  const parts: string[] = [];
  const ids: string[] = [];
  for (const { ex, i } of scored) {
    const id = ex.id ?? `example-${i}`;
    ids.push(id);
    parts.push(`#### ${id}`);
    parts.push(`- **User prompt:** ${ex.userPrompt}`);
    if (ex.outline) parts.push(`- **Outline / pattern:** ${ex.outline}`);
    if (ex.p21Notes) parts.push(`- **P21 notes:** ${ex.p21Notes}`);
    parts.push("");
  }

  return {
    markdown: parts.join("\n").trim(),
    ids,
    count: scored.length,
  };
}
