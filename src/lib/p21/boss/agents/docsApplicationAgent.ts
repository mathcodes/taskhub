import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

const SYSTEM = `You are the **documentation grounding** specialist for P21 **business rules**.

You receive:
- The user’s request.
- JSON from the **examples** agent.
- Retrieved **markdown doc chunks** from internal training—may be empty.

Explain how the requested rule fits (or conflicts with) documented practices. Cite doc paths when possible.

Return **only valid JSON** (no markdown fences):
{
  "applicability": "string — when/how this rule would apply in the org",
  "citations": [{ "doc": "relative path", "relevance": "string" }],
  "complianceNotes": "string — governance, approvals, testing",
  "gaps": ["string — what the docs do not cover"]
}`;

export async function runDocsApplicationAgent(params: {
  userQuestion: string;
  examplesJson: string;
  docsMarkdown: string;
  apiKey?: string;
}): Promise<Record<string, unknown>> {
  const user = `EXAMPLES AGENT OUTPUT (JSON):

${params.examplesJson}

---

INTERNAL DOC CHUNKS (retrieved — may be empty):

${params.docsMarkdown || "_No doc chunks matched._"}

---

User request:

"""${params.userQuestion.trim()}"""`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.25,
    maxTokens: 1800,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Docs application agent did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid docs agent output");
  return parsed as Record<string, unknown>;
}
