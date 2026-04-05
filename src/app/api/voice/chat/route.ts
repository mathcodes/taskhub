import { NextResponse } from "next/server";
import { runVoiceAssistantTurn, type VoiceChatTurn } from "@/lib/agents/voiceAssistantTurn";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key available. Add OPENAI_API_KEY on the server, or open “API key” and paste your own OpenAI key (stored in this browser only).",
      },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    transcript?: string;
    pathname?: string;
    viewLabel?: string;
    pageSummary?: string;
    priorMessages?: VoiceChatTurn[];
  };

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const pathname = body.pathname?.trim() || "/";
  const viewLabel = body.viewLabel?.trim() || "Unknown view";
  const pageSummary = body.pageSummary?.trim() || "(No summary provided.)";
  const priorMessages = Array.isArray(body.priorMessages) ? body.priorMessages : [];

  for (const m of priorMessages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return NextResponse.json({ error: "invalid priorMessages" }, { status: 400 });
    }
    if (typeof m.content !== "string") {
      return NextResponse.json({ error: "invalid priorMessages content" }, { status: 400 });
    }
  }

  try {
    const result = await runVoiceAssistantTurn({
      transcript,
      pathname,
      viewLabel,
      pageSummary,
      priorMessages,
      apiKey,
    });
    return NextResponse.json({
      reply: result.reply,
      createdTaskCount: result.createdTaskCount,
      navigateTo: result.navigateTo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Voice chat failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
