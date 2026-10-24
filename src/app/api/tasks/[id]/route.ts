import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      schedules: true,
      logs: { orderBy: { completedAt: "desc" }, take: 100 },
    },
  });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task });
}

type ScheduleInput = { dayOfWeek: number; dueTime?: string | null };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    title?: string;
    description?: string | null;
    active?: boolean;
    priority?: number;
    schedules?: ScheduleInput[];
  };

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.schedules) {
    for (const s of body.schedules) {
      if (typeof s.dayOfWeek !== "number" || s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        return NextResponse.json({ error: "each schedule needs dayOfWeek 0–6" }, { status: 400 });
      }
    }
    await prisma.taskSchedule.deleteMany({ where: { taskId: id } });
    await prisma.taskSchedule.createMany({
      data: body.schedules.map((s) => ({
        taskId: id,
        dayOfWeek: s.dayOfWeek,
        dueTime: s.dueTime?.trim() || null,
      })),
    });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
    },
    include: { schedules: true, logs: { orderBy: { completedAt: "desc" }, take: 30 } },
  });

  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await prisma.task.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
