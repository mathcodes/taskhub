import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Bundled AI training file: TOC + `FILE_START` … `FILE_END` sections per source file. */
const BUNDLE_REL = ["docs", "p21", "training", "boss", "docs", "business_rule_examples.txt"];

export type BossBundleChunk = { relPath: string; body: string };

export function getBossBundlePath(): string {
  return join(process.cwd(), ...BUNDLE_REL);
}

/**
 * Parse `business_rule_examples.txt` into one chunk per embedded file.
 * Uses `relative_path:` from the METADATA block when present.
 */
export function parseBossBundleIntoChunks(raw: string): BossBundleChunk[] {
  const re = /<<<<\s*FILE_START[^>]*>>>>\s*([\s\S]*?)<<<<\s*FILE_END[^>]*>>>>/g;
  const chunks: BossBundleChunk[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(raw)) !== null) {
    const block = m[1]?.trim() ?? "";
    if (!block) continue;
    const pathMatch = block.match(/relative_path:\s*(\S+)/);
    const rel = pathMatch?.[1]?.trim() ?? `segment-${i}`;
    i += 1;
    chunks.push({
      relPath: `bundle/${rel.replace(/\\/g, "/")}`,
      body: block,
    });
  }
  return chunks;
}

export function loadBossBundleChunks(): BossBundleChunk[] {
  const p = getBossBundlePath();
  if (!existsSync(p)) return [];
  try {
    const raw = readFileSync(p, "utf-8");
    return parseBossBundleIntoChunks(raw);
  } catch {
    return [];
  }
}
