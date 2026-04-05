import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { loadBossBundleChunks, type BossBundleChunk } from "@/lib/p21/boss/bossBundleCorpus";

const DOCS_ROOT = ["docs", "p21", "training", "boss", "docs"];

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
]);

export type BossDocChunk = {
  relPath: string;
  body: string;
};

/** Max characters per chunk injected into the LLM (full text still used for scoring). */
export const BOSS_DOC_CHUNK_PROMPT_CHARS = 10_000;

let cachedChunks: BossDocChunk[] | null = null;

function getDocsDir(): string {
  return join(process.cwd(), ...DOCS_ROOT);
}

function walkMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMdFiles(p));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

export function loadBossDocChunks(): BossDocChunk[] {
  if (cachedChunks) return cachedChunks;
  const root = getDocsDir();
  const files = walkMdFiles(root);
  const chunks: BossDocChunk[] = [];
  for (const abs of files) {
    try {
      const body = readFileSync(abs, "utf-8").trim();
      if (!body) continue;
      const relPath = relative(join(process.cwd(), "docs", "p21", "training", "boss"), abs);
      const normalized = relPath.replace(/\\/g, "/");
      // Skip the raw bundle file — parsed per-file below
      if (normalized === "docs/business_rule_examples.txt") continue;
      chunks.push({ relPath: normalized, body });
    } catch {
      /* skip */
    }
  }
  const bundleChunks: BossBundleChunk[] = loadBossBundleChunks();
  for (const b of bundleChunks) {
    chunks.push({ relPath: b.relPath, body: b.body });
  }
  cachedChunks = chunks;
  return chunks;
}

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function scoreChunk(chunk: BossDocChunk, words: string[]): number {
  const hay = `${chunk.relPath} ${chunk.body}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (hay.includes(w)) s += 1;
  }
  return s;
}

export function retrieveBossDocs(
  userQuestion: string,
  options?: { maxChunks?: number }
): { markdown: string; paths: string[]; count: number } {
  const chunks = loadBossDocChunks();
  const maxChunks = options?.maxChunks ?? 6;
  const words = tokenizeQuery(userQuestion);
  if (chunks.length === 0 || words.length === 0) {
    return { markdown: "", paths: [], count: 0 };
  }

  let scored = chunks
    .map((c) => ({ c, s: scoreChunk(c, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, maxChunks);

  if (scored.length === 0 && chunks.length > 0) {
    const bundle = chunks.filter((c) => c.relPath.startsWith("bundle/"));
    const pool = bundle.length > 0 ? bundle : chunks;
    scored = pool.slice(0, maxChunks).map((c) => ({ c, s: 0 }));
  }

  if (scored.length === 0) {
    return { markdown: "", paths: [], count: 0 };
  }

  const parts: string[] = [];
  const paths: string[] = [];
  for (const { c } of scored) {
    paths.push(c.relPath);
    parts.push(`### Doc: ${c.relPath}`);
    const body =
      c.body.length > BOSS_DOC_CHUNK_PROMPT_CHARS
        ? `${c.body.slice(0, BOSS_DOC_CHUNK_PROMPT_CHARS)}\n\n[truncated — full text used for retrieval match only]`
        : c.body;
    parts.push(body);
    parts.push("");
  }

  return {
    markdown: parts.join("\n").trim(),
    paths,
    count: scored.length,
  };
}
