import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

const SYSTEM = `You are the **examples** specialist for Epicor Prophet 21 (P21) **business rules**.

You receive:
- The user’s natural-language request.
- Retrieved **curated examples** (prompt → outline patterns) from the organization’s training file—may be empty.

Infer intent, map to the closest patterns, and list entities (documents, amounts, roles, customers, etc.).

Return **only valid JSON** (no markdown fences):
{
  "intentSummary": "string",
  "matchedPatterns": ["string"],
  "ruleTypeGuess": "string — e.g. order hold, credit check, pricing floor, allocation",
  "entities": ["string"],
  "openQuestions": ["string — what must be clarified before implementing in P21"]
}`;

export async function runExamplesUnderstandingAgent(params: {
  userQuestion: string;
  examplesMarkdown: string;
  apiKey?: string;
}): Promise<Record<string, unknown>> {
  const user = `CURATED EXAMPLES (retrieved — may be empty):

${params.examplesMarkdown || "_No examples matched._"}

---

User request:

"""${params.userQuestion.trim()}"""`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.2,
    maxTokens: 1200,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Examples agent did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid examples agent output");
  return parsed as Record<string, unknown>;
}
