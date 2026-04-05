import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

const SYSTEM = `You are the **SQL rule** specialist for Microsoft SQL Server (T-SQL) in the context of **P21 business rules**.

You receive:
- The user request.
- JSON output from the **examples understanding** agent.
- **Schema context** (table/column dictionary excerpt)—may be incomplete.

Produce **read-only diagnostic / condition-style** SQL sketches that could support or validate a rule (SELECT / CTEs only). Do not emit DML or DDL.

Return **only valid JSON** (no markdown fences):
{
  "conditionSql": "string — T-SQL sketch or empty if not applicable",
  "tablesReferenced": ["string"],
  "assumptions": ["string"],
  "risks": ["string — e.g. missing columns, need for joins not in schema excerpt"]
}`;

export async function runSqlRuleAgent(params: {
  userQuestion: string;
  examplesJson: string;
  schemaMarkdown: string;
  apiKey?: string;
}): Promise<Record<string, unknown>> {
  const user = `EXAMPLES AGENT OUTPUT (JSON):

${params.examplesJson}

---

SCHEMA CONTEXT (retrieved dictionary excerpt):

${params.schemaMarkdown}

---

User request:

"""${params.userQuestion.trim()}"""`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.15,
    maxTokens: 2000,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("SQL rule agent did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid SQL rule agent output");
  return parsed as Record<string, unknown>;
}
