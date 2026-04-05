import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

export type SqlReviewResult = {
  approved: boolean;
  severity: "ok" | "low" | "medium" | "high";
  issues: string[];
  suggestions: string;
};

const SYSTEM = `You are a strict SQL safety reviewer for Microsoft SQL Server (T-SQL).

Check the proposed SQL for:
- Only read operations (SELECT / WITH); flag any DML, DDL, or dangerous patterns.
- Obvious injection or dynamic SQL abuse (EXEC string concat, etc.).
- If the query is empty or nonsensical, reject.

Return **only valid JSON** (no markdown):
{"approved":true|false,"severity":"ok"|"low"|"medium"|"high","issues":["..."],"suggestions":"short note or empty string"}

Be conservative: if unsure, set approved false and explain in issues.`;

export async function runSqlReviewAgent(params: {
  sql: string;
  userQuestion: string;
  apiKey?: string;
}): Promise<SqlReviewResult> {
  const user = `User question (intent):

"""${params.userQuestion.trim()}"""

Proposed SQL:

"""${params.sql.trim()}"""`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.1,
    maxTokens: 800,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return {
      approved: false,
      severity: "high",
      issues: ["Reviewer did not return valid JSON"],
      suggestions: "Reject and regenerate.",
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      approved: false,
      severity: "high",
      issues: ["Invalid reviewer response"],
      suggestions: "",
    };
  }
  const o = parsed as Record<string, unknown>;
  return {
    approved: Boolean(o.approved),
    severity:
      o.severity === "low" || o.severity === "medium" || o.severity === "high" || o.severity === "ok"
        ? o.severity
        : "medium",
    issues: Array.isArray(o.issues) ? o.issues.filter((x): x is string => typeof x === "string") : [],
    suggestions: typeof o.suggestions === "string" ? o.suggestions : "",
  };
}
