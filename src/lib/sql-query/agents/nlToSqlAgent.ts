import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

export type NlToSqlResult = {
  sql: string;
  explanation: string;
  tablesReferenced: string[];
};

const SYSTEM = `You are an expert SQL analyst.

Rules:
- Generate read-only queries only: SELECT and read-only CTEs.
- Never emit INSERT, UPDATE, DELETE, MERGE, DROP, ALTER, TRUNCATE, EXEC, or DDL.
- Follow the requested SQL dialect.
- When schema context is provided, use only its tables and columns. If context is incomplete, explain the assumption.
- Prefer clear aliases and a reasonable row limit unless the user asks otherwise.
- Return strictly valid JSON only (no markdown fences):
{"sql":"...","explanation":"...","tablesReferenced":["table1"]}`;

export async function runNlToSqlAgent(params: {
  userQuestion: string;
  dialect: string;
  schemaContext?: string;
  apiKey?: string;
}): Promise<NlToSqlResult> {
  const schema = params.schemaContext?.trim() || "No schema supplied. State any naming assumptions clearly.";
  const user = `SQL dialect: ${params.dialect}

Schema context:
${schema}

User request:
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
    throw new Error("SQL model did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid SQL response");
  const result = parsed as Record<string, unknown>;
  const sql = typeof result.sql === "string" ? result.sql.trim() : "";
  if (!sql) throw new Error("Model returned empty SQL");
  return {
    sql,
    explanation: typeof result.explanation === "string" ? result.explanation.trim() : "",
    tablesReferenced: Array.isArray(result.tablesReferenced)
      ? result.tablesReferenced.filter((value): value is string => typeof value === "string")
      : [],
  };
}