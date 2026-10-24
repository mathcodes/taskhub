import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type StepRow = {
  index: number;
  title: string;
  instruction: string;
  guidance: string;
  recordHint: string;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const t = await prisma.playbookTemplate.findUnique({ where: { id: id.trim() } });
  if (!t) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let steps: StepRow[] = [];
  try {
    const j = JSON.parse(t.stepsJson) as { steps?: StepRow[] };
    steps = Array.isArray(j.steps) ? j.steps : [];
  } catch {
    steps = [];
  }

  return NextResponse.json({
    id: t.id,
    title: t.title,
    department: t.department,
    createdAt: t.createdAt.toISOString(),
    steps,
  });
}
