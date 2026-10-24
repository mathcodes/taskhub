/** Max files per run (upload + URL rows). */
export const MAX_SOURCES = 24;
/** Per-file byte cap before rejection. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Total upload budget (bytes) for one run. */
export const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
/** Truncate extracted text per source before LLM (chars). */
export const MAX_CHARS_PER_SOURCE = 100_000;

/** Max raw bytes when fetching a URL (HTML/PDF/etc.). */
export const MAX_URL_BYTES = 2 * 1024 * 1024;

export const OUTPUT_FILES = [
  "training-corpus.md",
  "source-cards.md",
  "reference-index.json",
  "RUN_MANIFEST.json",
] as const;

export type OutputFileName = (typeof OUTPUT_FILES)[number];
