import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/env";
import { notifyWorkerAssignment } from "@/lib/playbooks/notifyWorkers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type WorkerIn = {
  displayName?: string;
  email?: string;
  phone?: string;
};

export async function POST(req: Request) {
  let body: {
    playbookId?: string;
    label?: string;
    workers?: WorkerIn[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playbookId = body.playbookId?.trim();
  if (!playbookId) {
    return NextResponse.json({ error: "playbookId is required" }, { status: 400 });
  }

  const workersIn = Array.isArray(body.workers) ? body.workers : [];
  if (workersIn.length === 0) {
    return NextResponse.json({ error: "workers must be a non-empty array" }, { status: 400 });
  }

  const playbook = await prisma.playbookTemplate.findUnique({ where: { id: playbookId } });
  if (!playbook) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const normalized: { displayName: string; email: string | null; phone: string | null }[] = [];
  for (const w of workersIn) {
    const displayName = typeof w.displayName === "string" ? w.displayName.trim() : "";
    const email = typeof w.email === "string" && w.email.trim() ? w.email.trim() : null;
    const phone = typeof w.phone === "string" && w.phone.trim() ? w.phone.trim() : null;
    if (!displayName) {
      return NextResponse.json({ error: "Each worker needs displayName" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json(
        { error: `Worker "${displayName}" needs at least an email or phone` },
        { status: 400 }
      );
    }
    normalized.push({ displayName, email, phone });
  }

  const base = getAppBaseUrl();

  const { assignmentId, workerRows } = await prisma.$transaction(async (tx) => {
    const a = await tx.playbookAssignment.create({
      data: {
        playbookId,
        label: body.label?.trim() || null,
      },
    });

    const rows: { workerId: string; accessToken: string }[] = [];

    for (const w of normalized) {
      const accessToken = randomBytes(24).toString("hex");
      const worker = await tx.playbookAssignmentWorker.create({
        data: {
          assignmentId: a.id,
          displayName: w.displayName,
          email: w.email,
          phone: w.phone,
          accessToken,
        },
      });
      await tx.playbookRun.create({
        data: {
          workerId: worker.id,
          status: "pending",
        },
      });
      rows.push({ workerId: worker.id, accessToken });
    }

    return { assignmentId: a.id, workerRows: rows };
  });

  const workersOut: {
    workerId: string;
    accessToken: string;
    link: string;
    notifications: Awaited<ReturnType<typeof notifyWorkerAssignment>>;
  }[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const w = normalized[i];
    const row = workerRows[i];
    const link = `${base}/playbooks/r/${row.accessToken}`;
    const results = await notifyWorkerAssignment({
      displayName: w.displayName,
      playbookTitle: playbook.title,
      accessToken: row.accessToken,
      email: w.email,
      phone: w.phone,
    });
    const anyOk = results.some((r) => r.ok);
    await prisma.playbookAssignmentWorker.update({
      where: { id: row.workerId },
      data: { notifiedAt: anyOk ? new Date() : undefined },
    });
    workersOut.push({
      workerId: row.workerId,
      accessToken: row.accessToken,
      link,
      notifications: results,
    });
  }

  return NextResponse.json({
    assignmentId,
    playbookTitle: playbook.title,
    workers: workersOut,
  });
}
