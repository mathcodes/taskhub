import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

export type P21SchemaRow = {
  Table: string;
  Column_Name: string;
  Column_Description: string;
};

const CSV_REL = ["docs", "p21", "training", "sql_p21_db.csv"];

let cachedRows: P21SchemaRow[] | null = null;

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

export function getP21SchemaCsvPath(): string {
  return join(process.cwd(), ...CSV_REL);
}

export function loadP21SchemaDictionary(): P21SchemaRow[] {
  if (cachedRows) return cachedRows;
  const p = getP21SchemaCsvPath();
  if (!existsSync(p)) {
    throw new Error(`P21 schema CSV not found at ${p}`);
  }
  const raw = readFileSync(p, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as P21SchemaRow[];
  cachedRows = rows.filter((r) => r.Table && r.Column_Name);
  return cachedRows;
}

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function scoreRow(row: P21SchemaRow, words: string[]): number {
  const hay = `${row.Table} ${row.Column_Name} ${row.Column_Description}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (hay.includes(w)) s += 1;
  }
  return s;
}

/**
 * Picks tables most relevant to the user question, then returns full column list for those tables.
 */
export function retrieveRelevantSchema(
  userQuestion: string,
  options?: { maxTables?: number }
): { markdown: string; tables: string[]; rowCount: number } {
  const rows = loadP21SchemaDictionary();
  const words = tokenizeQuery(userQuestion);
  if (words.length === 0) {
    return {
      markdown: "_No search terms after tokenization; try a more specific question._",
      tables: [],
      rowCount: 0,
    };
  }

  const maxTables = options?.maxTables ?? 14;
  const tableScore = new Map<string, number>();

  for (const row of rows) {
    const sc = scoreRow(row, words);
    if (sc <= 0) continue;
    const t = row.Table;
    tableScore.set(t, (tableScore.get(t) ?? 0) + sc);
  }

  const sortedTables = [...tableScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTables)
    .map(([t]) => t);

  const byTable = new Map<string, P21SchemaRow[]>();
  for (const row of rows) {
    if (!sortedTables.includes(row.Table)) continue;
    const list = byTable.get(row.Table) ?? [];
    list.push(row);
    byTable.set(row.Table, list);
  }

  const parts: string[] = [];
  let rowCount = 0;
  for (const t of sortedTables) {
    const cols = byTable.get(t);
    if (!cols?.length) continue;
    parts.push(`### ${t}`);
    for (const c of cols) {
      parts.push(`- **${c.Column_Name}**: ${c.Column_Description}`);
      rowCount += 1;
    }
    parts.push("");
  }

  return {
    markdown: parts.join("\n").trim() || "_No matching schema rows for this question._",
    tables: sortedTables,
    rowCount,
  };
}
