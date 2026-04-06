import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import {
  agentMergeCorpus,
  agentReferenceIndex,
  agentSourceCard,
} from "@/lib/corpusBuilder/agents";
import {
  MAX_FILE_BYTES,
  MAX_SOURCES,
  MAX_TOTAL_BYTES,
  OUTPUT_FILES,
} from "@/lib/corpusBuilder/constants";
import { extractFromBuffer, extractFromUrl, type ExtractedSource } from "@/lib/corpusBuilder/extract";
import { outputDirForRun, uploadDirForRun } from "@/lib/corpusBuilder/paths";

export type CorpusFileInput = {
  name: string;
  type: string;
  buffer: Buffer;
};

export type CorpusBuilderResult = {
  runId: string;
  agentLog: string[];
  outputFiles: typeof OUTPUT_FILES;
  manifest: {
    runId: string;
    createdAt: string;
    sources: { label: string; kind: string; hadError: boolean }[];
  };
};

function safeSegment(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\-()+&! ]/g, "_").trim();
  return base.slice(0, 200) || "file.bin";
}

export function parseUrlList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    try {
      const u = new URL(t);
      if (u.protocol === "http:" || u.protocol === "https:") out.push(u.toString());
    } catch {
      /* skip bad line */
    }
  }
  return out;
}

export async function runCorpusBuilderPipeline(opts: {
  apiKey: string;
  files: CorpusFileInput[];
  urlField: string | undefined;
}): Promise<CorpusBuilderResult> {
  const urls = parseUrlList(opts.urlField);
  const totalSources = opts.files.length + urls.length;

  if (totalSources < 1) {
    throw new Error("Add at least one file or URL.");
  }
  if (totalSources > MAX_SOURCES) {
    throw new Error(`Too many sources (max ${MAX_SOURCES}).`);
  }

  let totalBytes = 0;
  for (const f of opts.files) {
    if (f.buffer.length > MAX_FILE_BYTES) {
      throw new Error(`File too large: ${f.name} (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB each).`);
    }
    totalBytes += f.buffer.length;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(`Total upload size too large (max ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB).`);
  }

  const runId = randomUUID();
  const up = uploadDirForRun(runId);
  const out = outputDirForRun(runId);
  await mkdir(up, { recursive: true });
  await mkdir(out, { recursive: true });

  const agentLog: string[] = [];
  const extracted: ExtractedSource[] = [];

  const usedNames = new Set<string>();
  for (let i = 0; i < opts.files.length; i++) {
    const f = opts.files[i];
    let seg = safeSegment(f.name);
    if (usedNames.has(seg)) seg = `${i}-${seg}`;
    usedNames.add(seg);
    await writeFile(join(up, seg), f.buffer);
    agentLog.push(`Stored upload: ${f.name}`);
    const ex = await extractFromBuffer(f.buffer, f.name, f.type, opts.apiKey);
    extracted.push(ex);
  }

  for (const url of urls) {
    agentLog.push(`Fetching URL: ${url}`);
    const ex = await extractFromUrl(url, opts.apiKey);
    extracted.push(ex);
  }

  await rm(up, { recursive: true, force: true });
  agentLog.push("Deleted temporary upload files from disk.");

  agentLog.push(`Running Source Analyst agent on ${extracted.length} source(s)…`);
  const cards: string[] = [];
  const batchSize = 4;
  for (let i = 0; i < extracted.length; i += batchSize) {
    const batch = extracted.slice(i, i + batchSize);
    const parts = await Promise.all(batch.map((s) => agentSourceCard(opts.apiKey, s)));
    cards.push(...parts);
  }
  agentLog.push("Source Analyst complete.");

  agentLog.push("Running Corpus Synthesis agent…");
  const corpus = await agentMergeCorpus(opts.apiKey, cards);
  agentLog.push("Corpus Synthesis complete.");

  agentLog.push("Running Reference Index agent…");
  const referenceJson = await agentReferenceIndex(opts.apiKey, corpus);
  agentLog.push("Reference Index complete.");

  const sourceCardsMd = [`# Source cards\n`, ...cards.map((c, i) => `\n---\n\n## Card ${i + 1}\n\n${c}`)].join(
    ""
  );

  const manifest = {
    runId,
    createdAt: new Date().toISOString(),
    sources: extracted.map((e) => ({
      label: e.label,
      kind: e.kind,
      hadError: Boolean(e.error),
    })),
  };

  await writeFile(join(out, "training-corpus.md"), corpus, "utf-8");
  await writeFile(join(out, "source-cards.md"), sourceCardsMd, "utf-8");
  await writeFile(join(out, "reference-index.json"), referenceJson, "utf-8");
  await writeFile(join(out, "RUN_MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf-8");

  agentLog.push(`Wrote outputs under .data/corpus-builder/outputs/${runId}/`);

  return {
    runId,
    agentLog,
    outputFiles: OUTPUT_FILES,
    manifest,
  };
}
