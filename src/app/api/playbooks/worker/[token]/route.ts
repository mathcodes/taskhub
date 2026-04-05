import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ExpandedPayload = {
  steps: {
    index: number;
    title: string;
    instruction: string;
    guidance: string;
    recordHint: string;
  }[];
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const t = token?.trim();
  if (!t) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const worker = await prisma.playbookAssignmentWorker.findUnique({
    where: { accessToken: t },
    include: {
      assignment: { include: { playbook: true } },
      run: { include: { stepResults: true } },
    },
  });

  if (!worker || !worker.run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let expanded: ExpandedPayload;
  try {
    expanded = JSON.parse(worker.assignment.playbook.stepsJson) as ExpandedPayload;
  } catch {
    return NextResponse.json({ error: "Corrupt playbook data" }, { status: 500 });
  }

  const byIndex = new Map<number, { done: boolean; note: string | null; completedAt: string }>();
  for (const r of worker.run.stepResults) {
    byIndex.set(r.stepIndex, {
      done: r.done,
      note: r.note,
      completedAt: r.completedAt.toISOString(),
    });
  }

  return NextResponse.json({
    worker: {
      displayName: worker.displayName,
      playbookTitle: worker.assignment.playbook.title,
      department: worker.assignment.playbook.department,
      assignmentLabel: worker.assignment.label,
    },
    run: {
      id: worker.run.id,
      status: worker.run.status,
      startedAt: worker.run.startedAt?.toISOString() ?? null,
      completedAt: worker.run.completedAt?.toISOString() ?? null,
    },
    steps: expanded.steps,
    progress: Object.fromEntries(byIndex),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const t = token?.trim();
  if (!t) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let body: {
    action?: string;
    stepIndex?: number;
    done?: boolean;
    note?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const worker = await prisma.playbookAssignmentWorker.findUnique({
    where: { accessToken: t },
    include: {
      assignment: { include: { playbook: true } },
      run: { include: { stepResults: true } },
    },
  });

  if (!worker || !worker.run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let stepCount = 0;
  try {
    const ex = JSON.parse(worker.assignment.playbook.stepsJson) as ExpandedPayload;
    stepCount = ex.steps?.length ?? 0;
  } catch {
    return NextResponse.json({ error: "Corrupt playbook" }, { status: 500 });
  }

  if (body.action === "start") {
    await prisma.playbookRun.update({
      where: { id: worker.run.id },
      data: {
        status: "in_progress",
        startedAt: worker.run.startedAt ?? new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.stepIndex !== "number" || body.stepIndex < 0 || body.stepIndex >= stepCount) {
    return NextResponse.json({ error: "Invalid stepIndex" }, { status: 400 });
  }

  const done = body.done !== false;
  const note =
    typeof body.note === "string" ? body.note.trim() || null : body.note === null ? null : undefined;

  await prisma.playbookStepResult.upsert({
    where: {
      runId_stepIndex: { runId: worker.run.id, stepIndex: body.stepIndex },
    },
    create: {
      runId: worker.run.id,
      stepIndex: body.stepIndex,
      done,
      note: note ?? null,
    },
    update: {
      done,
      ...(note !== undefined ? { note } : {}),
      completedAt: new Date(),
    },
  });

  const results = await prisma.playbookStepResult.findMany({
    where: { runId: worker.run.id },
  });
  let allComplete = true;
  for (let i = 0; i < stepCount; i++) {
    const row = results.find((r) => r.stepIndex === i);
    if (!row?.done) {
      allComplete = false;
      break;
    }
  }

  if (allComplete) {
    await prisma.playbookRun.update({
      where: { id: worker.run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
  } else {
    await prisma.playbookRun.update({
      where: { id: worker.run.id },
      data: {
        status: "in_progress",
        startedAt: worker.run.startedAt ?? new Date(),
        completedAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
