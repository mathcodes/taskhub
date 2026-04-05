import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/data";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";
import { runMonitorAgent } from "@/lib/agents/monitorAgent";

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key available. Set OPENAI_API_KEY on the server or add your key under API key in the app.",
      },
      { status: 503 }
    );
  }
  const { snapshot } = await buildDashboardSnapshot();
  try {
    const agent = await runMonitorAgent(snapshot, { apiKey });
    return NextResponse.json({ snapshot, agent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "agent failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
