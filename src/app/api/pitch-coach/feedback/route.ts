import { NextResponse } from "next/server";
import { anthropicMessage, AnthropicKeyMissingError } from "@/lib/anthropic";
import { resolveAnthropicKeyFromRequest } from "@/lib/anthropicRequestKey";
import type { AnalysisReport } from "@/lib/pitchCoach/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Turns a pitch-accuracy report (computed in the browser) into coaching feedback
 * with Claude. Only the numeric report is sent here; the audio never leaves the browser.
 */
export async function POST(req: Request) {
  const apiKey = resolveAnthropicKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json({ error: new AnthropicKeyMissingError().message }, { status: 401 });
  }

  let body: { report?: AnalysisReport; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const report = body.report;
  if (!report?.stats || !Array.isArray(report.note_results)) {
    return NextResponse.json({ error: "Missing pitch report" }, { status: 400 });
  }

  const summary = {
    ...report.stats,
    note_by_note: report.note_results.slice(0, 60).map((n) => ({
      played: n.played,
      expected: n.expected,
      cents_off: n.cents_off,
      label: n.label,
    })),
  };
  const context = String(body.context ?? "").slice(0, 300);

  try {
    const feedback = await anthropicMessage({
      apiKey,
      maxTokens: 700,
      system:
        "You are a concise guitar and vocal coach. Give direct, practical feedback from the pitch report. " +
        "Format in markdown with exactly these sections: ## Overall, ## What's working, ## Focus areas. " +
        "Use short bullet points in Focus areas. Max 250 words. Cents are hundredths of a semitone; " +
        "within ±10¢ is excellent, ±25¢ is good.",
      user: `Pitch accuracy report:\n${JSON.stringify(summary)}\n\nPlayer context: ${context || "none given"}`,
    });
    return NextResponse.json({ feedback_md: feedback });
  } catch (e) {
    if (e instanceof AnthropicKeyMissingError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Claude couldn't generate feedback right now. Try again." }, { status: 502 });
  }
}
