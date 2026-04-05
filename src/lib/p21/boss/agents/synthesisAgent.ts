import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

const SYSTEM = `You are the **synthesis** step for the BOSS (Business Rule Orchestration) pipeline.

Merge the three prior JSON outputs into a single **implementation-ready specification** for a human P21 administrator.

Return **only valid JSON** (no markdown fences):
{
  "ruleName": "short title",
  "description": "1–3 sentences",
  "triggers": ["when the rule should run — business language"],
  "conditionSummary": "plain language; may reference SQL sketch conceptually",
  "conditionSql": "string — copy or refine from SQL agent; may be empty",
  "actions": ["what P21 or the org should do — business language"],
  "implementationChecklist": ["ordered steps for configuration / testing"],
  "warnings": ["risks, gaps, open questions"],
  "reviewNotes": "what to verify before go-live"
}`;

export async function runSynthesisAgent(params: {
  userQuestion: string;
  examplesJson: string;
  sqlJson: string;
  docsJson: string;
  apiKey?: string;
}): Promise<Record<string, unknown>> {
  const user = `User request:

"""${params.userQuestion.trim()}"""

---

EXAMPLES AGENT JSON:

${params.examplesJson}

---

SQL RULE AGENT JSON:

${params.sqlJson}

---

DOCS AGENT JSON:

${params.docsJson}

---

Produce the merged specification JSON.`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.2,
    maxTokens: 2200,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Synthesis agent did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid synthesis output");
  return parsed as Record<string, unknown>;
}
