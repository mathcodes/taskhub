import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";
import { getTaskHubTimezone } from "@/lib/env";

export type ParsedSchedule = { dayOfWeek: number; dueTime: string | null };
export type ParsedTask = {
  title: string;
  description: string | null;
  priority: number;
  schedules: ParsedSchedule[];
};

function isSchedule(x: unknown): x is ParsedSchedule {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.dayOfWeek !== "number" || o.dayOfWeek < 0 || o.dayOfWeek > 6) return false;
  if (o.dueTime != null && typeof o.dueTime !== "string") return false;
  return true;
}

export function normalizeTask(raw: unknown): ParsedTask | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.title !== "string" || !o.title.trim()) return null;
  const description =
    o.description === null || o.description === undefined
      ? null
      : typeof o.description === "string"
        ? o.description.trim() || null
        : null;
  const priority =
    typeof o.priority === "number" && Number.isFinite(o.priority) ? Math.round(o.priority) : 0;
  const schedulesRaw = o.schedules;
  const schedules: ParsedSchedule[] = [];
  if (Array.isArray(schedulesRaw)) {
    for (const s of schedulesRaw) {
      if (!isSchedule(s)) continue;
      schedules.push({
        dayOfWeek: s.dayOfWeek,
        dueTime: s.dueTime?.trim() ? s.dueTime.trim() : null,
      });
    }
  }
  return {
    title: o.title.trim(),
    description,
    priority,
    schedules,
  };
}

export async function parseTasksFromTranscript(transcript: string): Promise<ParsedTask[]> {
  const tz = getTaskHubTimezone();
  const system = `You extract structured tasks from spoken or written natural language for Task Hub.
Return a single JSON object with one key "tasks" whose value is an array.
Each task object must have:
- "title" (string, required)
- "description" (string or null)
- "priority" (integer, default 0; use 1–5 only if the user clearly indicates urgency)
- "schedules" (array of objects with "dayOfWeek" 0–6 and optional "dueTime")
Rules for dayOfWeek: 0 = Sunday … 6 = Saturday (JavaScript convention).
If the user says weekdays, use 1,2,3,4,5. If they say weekends, use 0 and 6.
"dueTime" must be 24-hour "HH:MM" or null if only a day is mentioned.
If no schedule is mentioned, use an empty array for schedules.
Respond with ONLY valid JSON, no markdown fences or commentary.`;

  const user = `Configured timezone label for interpreting phrases like "tomorrow morning": ${tz}

User message:
"""${transcript}"""`;

  const raw = await chatCompletion(system, user, { temperature: 0.2, maxTokens: 2000 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || !("tasks" in parsed)) {
    throw new Error('Expected JSON shape { "tasks": [...] }');
  }
  const arr = (parsed as { tasks: unknown }).tasks;
  if (!Array.isArray(arr)) {
    throw new Error("tasks must be an array");
  }
  const out: ParsedTask[] = [];
  for (const item of arr) {
    const t = normalizeTask(item);
    if (t) out.push(t);
  }
  if (out.length === 0) {
    throw new Error("No tasks could be parsed from that message");
  }
  return out;
}
