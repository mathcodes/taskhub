import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";
import { normalizeTask, type ParsedTask } from "@/lib/agents/parseTasksFromSpeech";
import { getTaskHubTimezone } from "@/lib/env";
import { normalizeVoiceNavigatePath } from "@/lib/voiceNavigate";
import { prisma } from "@/lib/prisma";

export type VoiceChatTurn = { role: "user" | "assistant"; content: string };

export async function runVoiceAssistantTurn(params: {
  transcript: string;
  pathname: string;
  viewLabel: string;
  pageSummary: string;
  priorMessages: VoiceChatTurn[];
  apiKey?: string;
}): Promise<{ reply: string; createdTaskCount: number; navigateTo: string | null }> {
  const tz = getTaskHubTimezone();
  const system = `You are the voice assistant for this app: Task Hub (weekly tasks, logs, agents), Multi-Agent Assessment (Claude), Three joke agents (OpenAI), P21 SQL Query Master (natural language to SQL), BOSS business rules, Department playbooks, and the home page that lists features.

Configured timezone: ${tz}.

The user is on URL path: ${params.pathname}
Current view: ${params.viewLabel}

Screen summary (what they are looking at):
${params.pageSummary}

Help them with:
- Questions about their tasks, schedules, today’s slots, completion log, or agents.
- Explaining what is on screen or what to do next.
- Adding tasks when they ask to create, add, remember, or schedule something.
- P21 / SQL questions when that context is relevant.
- When they clearly ask to open, go to, or navigate to a screen, set "navigate" to one of: "/", "/taskhub", "/taskhub/multi-agent-assessment", "/joke-agents", "/p21", "/p21/boss", "/playbooks". Use null if they are not asking to change pages.

You MUST respond with ONLY valid JSON (no markdown fences):
{
  "reply": "string — concise, friendly, suitable to read aloud",
  "tasks": [ ... ],
  "navigate": null
}

"navigate" must be null or exactly "/", "/taskhub", "/taskhub/multi-agent-assessment", "/joke-agents", "/p21", "/p21/boss", or "/playbooks".

Use an empty "tasks" array when they are not asking to create tasks.

Each task in "tasks" must have:
- "title" (string, required)
- "description" (string or null)
- "priority" (integer, default 0)
- "schedules" (array of { "dayOfWeek": 0-6, "dueTime": "HH:MM" or null })
dayOfWeek: 0 = Sunday … 6 = Saturday. "weekdays" → 1–5. "weekends" → 0 and 6.`;

  const prior = params.priorMessages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const user = `Prior conversation:
${prior || "(none)"}

User said (transcribed speech):
"""${params.transcript}"""`;

  const raw = await chatCompletion(system, user, {
    temperature: 0.35,
    maxTokens: 1800,
    apiKey: params.apiKey,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("Assistant did not return valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid assistant response");
  }
  const o = parsed as Record<string, unknown>;
  const reply = typeof o.reply === "string" ? o.reply.trim() : "I could not form a reply.";
  const navigateTo = normalizeVoiceNavigatePath(o.navigate);
  const tasksRaw = Array.isArray(o.tasks) ? o.tasks : [];
  const parsedTasks: ParsedTask[] = [];
  for (const item of tasksRaw) {
    const t = normalizeTask(item);
    if (t) parsedTasks.push(t);
  }

  if (parsedTasks.length === 0) {
    return { reply, createdTaskCount: 0, navigateTo };
  }

  const created = await prisma.$transaction(
    parsedTasks.map((t) =>
      prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          priority: t.priority,
          schedules: {
            create: t.schedules.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              dueTime: s.dueTime,
            })),
          },
        },
      })
    )
  );

  return { reply, createdTaskCount: created.length, navigateTo };
}
