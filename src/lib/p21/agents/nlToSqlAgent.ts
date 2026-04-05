import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

export type NlToSqlResult = {
  sql: string;
  explanation: string;
  tablesReferenced: string[];
};

const SYSTEM = `You are an expert Microsoft SQL Server (T-SQL) analyst for the P21 ERP database.

Rules:
- Generate **read-only** queries: SELECT (and CTEs, JOINs, WHERE, GROUP BY, window functions as needed).
- **Never** emit INSERT, UPDATE, DELETE, MERGE, DROP, ALTER, TRUNCATE, EXEC, xp_, OPENROWSET, or DDL.
- Use only tables and columns that appear in the SCHEMA CONTEXT below. If something is missing, say so in explanation and use the closest valid objects.
- Prefer clear column aliases and reasonable row limits for ad-hoc exploration (e.g. TOP (500)) unless the user asks otherwise.
- Return **strictly valid JSON** only (no markdown fences), shape:
{"sql":"...","explanation":"...","tablesReferenced":["table1","table2"]}
`;

export async function runNlToSqlAgent(params: {
  userQuestion: string;
  schemaMarkdown: string;
  apiKey?: string;
}): Promise<NlToSqlResult> {
  const user = `SCHEMA CONTEXT (retrieved dictionary — not exhaustive of entire P21, only relevant tables/columns):

${params.schemaMarkdown}

---

User question (natural language):

"""${params.userQuestion.trim()}"""`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.15,
    maxTokens: 2500,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("NL→SQL model did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid NL→SQL response");
  const o = parsed as Record<string, unknown>;
  const sql = typeof o.sql === "string" ? o.sql.trim() : "";
  const explanation = typeof o.explanation === "string" ? o.explanation.trim() : "";
  const tablesReferenced = Array.isArray(o.tablesReferenced)
    ? o.tablesReferenced.filter((x): x is string => typeof x === "string")
    : [];
  if (!sql) throw new Error("Model returned empty sql");
  return { sql, explanation, tablesReferenced };
}
