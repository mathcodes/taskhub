import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { buildDashboardSnapshot } from "@/lib/data";
import { getTaskHubTimezone } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { runDailySummaryAgent } from "@/lib/agents/dailySummaryAgent";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

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

  const url = new URL(req.url);
  const save = url.searchParams.get("save") === "1";
  const { snapshot, yesterdayKey, yesterdayCompletions } = await buildDashboardSnapshot();
  const tz = getTaskHubTimezone();
  const now = new Date();
  const reportDate = format(toZonedTime(now, tz), "yyyy-MM-dd");

  try {
    const markdown = await runDailySummaryAgent({
      reportDate,
      yesterdayKey,
      yesterdayCompletions,
      snapshot,
      apiKey,
    });

    if (save) {
      await prisma.dailyReport.upsert({
        where: { reportDate },
        create: { reportDate, bodyMarkdown: markdown },
        update: { bodyMarkdown: markdown },
      });
    }

    return NextResponse.json({ reportDate, markdown, saved: save });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "agent failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
