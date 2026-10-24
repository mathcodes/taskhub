import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    rating?: number | null;
    notes?: string | null;
    meta?: Record<string, unknown> | null;
    completedAt?: string;
  };

  if (body.rating != null && (body.rating < 1 || body.rating > 5)) {
    return NextResponse.json({ error: "rating must be 1–5 or null" }, { status: 400 });
  }

  const log = await prisma.taskCompletionLog.create({
    data: {
      taskId: id,
      rating: body.rating ?? null,
      notes: body.notes?.trim() || null,
      meta: body.meta ? JSON.stringify(body.meta) : null,
      ...(body.completedAt ? { completedAt: new Date(body.completedAt) } : {}),
    },
  });

  return NextResponse.json({ log });
}
