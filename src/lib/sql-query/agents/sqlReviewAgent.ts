import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

export type SqlReviewResult = {
  approved: boolean;
  severity: "ok" | "low" | "medium" | "high";
  issues: string[];
  suggestions: string;
};

const SYSTEM = `You are a strict SQL safety reviewer.

Check that the proposed query:
- Uses only read operations (SELECT or WITH).
- Contains no DML, DDL, dynamic execution, or dangerous patterns.
- Is valid for the requested dialect and plausibly matches the user's intent.

Return only valid JSON:
{"approved":true,"severity":"ok","issues":[],"suggestions":""}`;

export async function runSqlReviewAgent(params: {
  sql: string;
  userQuestion: string;
  dialect: string;
  apiKey?: string;
}): Promise<SqlReviewResult> {
  const raw = await chatCompletion(
    SYSTEM,
    `Dialect: ${params.dialect}\n\nUser request:\n${params.userQuestion}\n\nProposed SQL:\n${params.sql}`,
    { temperature: 0.1, maxTokens: 800, apiKey: params.apiKey }
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    return { approved: false, severity: "high", issues: ["Reviewer returned invalid JSON"], suggestions: "Regenerate the query." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { approved: false, severity: "high", issues: ["Invalid reviewer response"], suggestions: "" };
  }
  const result = parsed as Record<string, unknown>;
  return {
    approved: Boolean(result.approved),
    severity:
      result.severity === "ok" || result.severity === "low" || result.severity === "medium" || result.severity === "high"
        ? result.severity
        : "medium",
    issues: Array.isArray(result.issues)
      ? result.issues.filter((value): value is string => typeof value === "string")
      : [],
    suggestions: typeof result.suggestions === "string" ? result.suggestions : "",
  };
}