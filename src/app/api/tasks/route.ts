import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: {
      schedules: true,
      logs: { orderBy: { completedAt: "desc" }, take: 30 },
    },
  });
  return NextResponse.json({ tasks });
}

type ScheduleInput = { dayOfWeek: number; dueTime?: string | null };

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    priority?: number;
    schedules?: ScheduleInput[];
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const schedules = Array.isArray(body.schedules) ? body.schedules : [];
  for (const s of schedules) {
    if (typeof s.dayOfWeek !== "number" || s.dayOfWeek < 0 || s.dayOfWeek > 6) {
      return NextResponse.json({ error: "each schedule needs dayOfWeek 0–6" }, { status: 400 });
    }
  }

  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority: typeof body.priority === "number" ? body.priority : 0,
      schedules: {
        create: schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dueTime: s.dueTime?.trim() || null,
        })),
      },
    },
    include: { schedules: true, logs: true },
  });

  return NextResponse.json({ task });
}
