import { readFileSync, existsSync } from "fs";
import { join } from "path";

const JSON_REL = ["docs", "p21", "training", "nl_sql_examples.json"];

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
]);

export type NlSqlExample = {
  question: string;
  sql: string;
  tags?: string[];
  notes?: string;
};

let cached: NlSqlExample[] | null = null;

export function getNlSqlExamplesPath(): string {
  return join(process.cwd(), ...JSON_REL);
}

export function loadNlSqlExamples(): NlSqlExample[] {
  if (cached) return cached;
  const p = getNlSqlExamplesPath();
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
  if (!Array.isArray(parsed)) {
    throw new Error(`${p} must be a JSON array`);
  }
  const out: NlSqlExample[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question.trim() : "";
    const sql = typeof o.sql === "string" ? o.sql.trim() : "";
    if (!question || !sql) continue;
    const tags = Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : undefined;
    const notes = typeof o.notes === "string" ? o.notes.trim() : undefined;
    out.push({ question, sql, tags, notes });
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

function scoreExample(ex: NlSqlExample, words: string[]): number {
  const tagStr = (ex.tags ?? []).join(" ");
  const hay = `${ex.question} ${tagStr} ${ex.notes ?? ""}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (hay.includes(w)) s += 1;
  }
  return s;
}

/**
 * Picks curated NL→SQL pairs most similar to the user question (word overlap).
 * Empty file or no overlap returns empty markdown.
 */
export function retrieveRelevantNlSqlExamples(
  userQuestion: string,
  options?: { maxExamples?: number }
): { markdown: string; exampleIds: string[]; count: number } {
  const examples = loadNlSqlExamples();
  const max = options?.maxExamples ?? 4;
  const words = tokenizeQuery(userQuestion);
  if (examples.length === 0 || words.length === 0) {
    return { markdown: "", exampleIds: [], count: 0 };
  }

  const scored = examples
    .map((ex, i) => ({ ex, i, s: scoreExample(ex, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max);

  if (scored.length === 0) {
    return { markdown: "", exampleIds: [], count: 0 };
  }

  const parts: string[] = [];
  const exampleIds: string[] = [];
  for (const { ex, i } of scored) {
    const id = `ex-${i}`;
    exampleIds.push(id);
    parts.push(`#### ${id}`);
    parts.push(`- **Natural language:** ${ex.question}`);
    parts.push("```sql");
    parts.push(ex.sql);
    parts.push("```");
    if (ex.notes) parts.push(`- *Notes:* ${ex.notes}`);
    parts.push("");
  }

  return {
    markdown: parts.join("\n").trim(),
    exampleIds,
    count: scored.length,
  };
}
