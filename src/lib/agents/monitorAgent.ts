import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";
import { snapshotForAgents } from "@/lib/schedule";

export type TaskSnapshot = ReturnType<typeof snapshotForAgents>;

const SYSTEM = `You are the Task Monitor agent. You review structured task snapshots and completion logs.
Your job is to produce actionable alerts and brief reasoning for a single user.

Rules:
- Prefer clear, short titles and messages.
- Respect the snapshot: do not invent tasks that are not present.
- Severity: "critical" for overdue, "warning" for due soon or at risk, "info" for encouragement or patterns.
- Return STRICT JSON only (no markdown outside JSON) with this shape:
{
  "alerts": [
    {
      "severity": "critical" | "warning" | "info",
      "title": "string",
      "detail": "string",
      "taskId": "string or null"
    }
  ],
  "insights": ["short bullet as string"],
  "focusNext": ["what to do next, as short strings"]
}`;

export type MonitorAgentResult = {
  alerts: { severity: string; title: string; detail: string; taskId: string | null }[];
  insights: string[];
  focusNext: string[];
};

export async function runMonitorAgent(
  snapshot: TaskSnapshot,
  options?: { apiKey?: string }
): Promise<MonitorAgentResult> {
  const user = JSON.stringify(snapshot, null, 2);
  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.3,
    maxTokens: 1000,
    apiKey: options?.apiKey,
  });
  const parsed = JSON.parse(stripJsonFence(raw)) as MonitorAgentResult;
  if (!Array.isArray(parsed.alerts)) parsed.alerts = [];
  if (!Array.isArray(parsed.insights)) parsed.insights = [];
  if (!Array.isArray(parsed.focusNext)) parsed.focusNext = [];
  return parsed;
}
