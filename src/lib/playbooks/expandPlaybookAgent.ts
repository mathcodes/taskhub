import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";
import type { ParsedPlaybookUpload } from "@/lib/playbooks/parseUpload";

export type ExpandedPlaybookStep = {
  index: number;
  title: string;
  instruction: string;
  guidance: string;
  recordHint: string;
};

export type ExpandedPlaybookPayload = {
  steps: ExpandedPlaybookStep[];
};

const SYSTEM = `You are a senior operations trainer for industrial distribution (warehouse, counter, receiving, shipping).

Given a supervisor-authored checklist (title + short step lines), expand each step into a clear **walkthrough** for floor workers.

Rules:
- Keep language practical, short sentences, no jargon unless common on a DC floor.
- "instruction" = what to do (imperative).
- "guidance" = 2–4 sentences: tips, order of operations, what "good" looks like.
- "recordHint" = what to write down or snap a photo of (if nothing, say "None").
- "title" = 3–8 word heading for the step card.
- Indices must start at 0 and match the input order.

Return **only** valid JSON (no markdown fences):
{
  "steps": [
    {
      "index": 0,
      "title": "string",
      "instruction": "string",
      "guidance": "string",
      "recordHint": "string"
    }
  ]
}`;

export async function expandPlaybookWithAgent(
  parsed: ParsedPlaybookUpload,
  apiKey?: string
): Promise<ExpandedPlaybookPayload> {
  const user = `Playbook title: ${parsed.title}
Department: ${parsed.department ?? "(not specified)"}

Supervisor steps (in order):
${parsed.steps.map((s, i) => `${i}. ${s.text}`).join("\n")}

Produce the JSON with exactly ${parsed.steps.length} steps.`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.25,
    maxTokens: 3500,
    apiKey,
  });
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Playbook agent did not return valid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Invalid playbook expansion");
  const stepsRaw = (data as { steps?: unknown }).steps;
  if (!Array.isArray(stepsRaw)) throw new Error("Expanded playbook missing steps array");

  const steps: ExpandedPlaybookStep[] = [];
  for (let i = 0; i < stepsRaw.length; i++) {
    const row = stepsRaw[i];
    if (!row || typeof row !== "object") throw new Error(`Invalid step at index ${i}`);
    const r = row as Record<string, unknown>;
    const index = typeof r.index === "number" ? r.index : i;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const instruction = typeof r.instruction === "string" ? r.instruction.trim() : "";
    const guidance = typeof r.guidance === "string" ? r.guidance.trim() : "";
    const recordHint = typeof r.recordHint === "string" ? r.recordHint.trim() : "";
    if (!title || !instruction) throw new Error(`Step ${i} missing title or instruction`);
    steps.push({ index, title, instruction, guidance, recordHint });
  }

  if (steps.length !== parsed.steps.length) {
    throw new Error(`Expected ${parsed.steps.length} expanded steps, got ${steps.length}`);
  }

  return { steps };
}
