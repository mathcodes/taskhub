import { chatCompletion } from "@/lib/agents/openai";
import type { TaskSnapshot } from "@/lib/agents/monitorAgent";

const SYSTEM = `You are the Daily Summary agent for a personal task system.
Write a concise, friendly daily brief in Markdown.

Include:
- A short greeting with the report date.
- What was completed recently (from the data).
- What is still open or at risk today.
- One realistic suggestion for tomorrow.

Use headings (##), bullet lists, and bold for emphasis. Keep it under 400 words.`;

export async function runDailySummaryAgent(payload: {
  reportDate: string;
  yesterdayKey: string;
  yesterdayCompletions: unknown[];
  snapshot: TaskSnapshot;
  apiKey?: string;
}): Promise<string> {
  const user = JSON.stringify(payload, null, 2);
  return chatCompletion(SYSTEM, user, {
    temperature: 0.5,
    maxTokens: 1500,
    apiKey: payload.apiKey,
  });
}
