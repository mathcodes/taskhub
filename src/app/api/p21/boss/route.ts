import { NextResponse } from "next/server";
import { runBossPipeline } from "@/lib/p21/boss/runBossPipeline";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key. Set OPENAI_API_KEY on the server or use the API key control (BYOK) in the app header.",
      },
      { status: 503 }
    );
  }

  let body: { question?: string };
  try {
    body = (await req.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    const result = await runBossPipeline({ question, apiKey });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "BOSS pipeline failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
