import { NextResponse } from "next/server";
import { expandPlaybookWithAgent } from "@/lib/playbooks/expandPlaybookAgent";
import { parsePlaybookUploadJson } from "@/lib/playbooks/parseUpload";
import { prisma } from "@/lib/prisma";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

export const runtime = "nodejs";

export async function GET() {
  const list = await prisma.playbookTemplate.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    templates: list.map((t) => {
      let stepCount = 0;
      try {
        const j = JSON.parse(t.stepsJson) as { steps?: unknown[] };
        stepCount = Array.isArray(j.steps) ? j.steps.length : 0;
      } catch {
        stepCount = 0;
      }
      return {
        id: t.id,
        title: t.title,
        department: t.department,
        createdAt: t.createdAt.toISOString(),
        stepCount,
      };
    }),
  });
}

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

  let body: { rawJson?: string };
  try {
    body = (await req.json()) as { rawJson?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.rawJson?.trim();
  if (!raw) {
    return NextResponse.json({ error: "rawJson is required" }, { status: 400 });
  }

  try {
    const parsed = parsePlaybookUploadJson(raw);
    const expanded = await expandPlaybookWithAgent(parsed, apiKey);
    const stepsJson = JSON.stringify(expanded);
    const created = await prisma.playbookTemplate.create({
      data: {
        title: parsed.title,
        department: parsed.department,
        rawJson: raw,
        stepsJson,
      },
    });
    return NextResponse.json({
      id: created.id,
      title: created.title,
      department: created.department,
      steps: expanded.steps,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create playbook";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
