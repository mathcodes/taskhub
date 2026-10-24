import { prisma } from "@/lib/prisma";
import {
  dateKeyInTz,
  snapshotForAgents,
  yesterdayKeyInTz,
  type TaskWithRelations,
} from "@/lib/schedule";
import { getTaskHubTimezone } from "@/lib/env";

export async function loadTasksWithLogs(): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: {
      schedules: true,
      logs: {
        orderBy: { completedAt: "desc" },
        take: 120,
      },
    },
  });
}

export async function buildDashboardSnapshot() {
  const tz = getTaskHubTimezone();
  const tasks = await loadTasksWithLogs();
  const snapshot = snapshotForAgents(tasks, new Date(), tz);
  const now = new Date();
  const yesterdayKey = yesterdayKeyInTz(now, tz);
  const yesterdayCompletions = tasks.flatMap((t) =>
    t.logs
      .filter((l) => dateKeyInTz(l.completedAt, tz) === yesterdayKey)
      .map((l) => ({
        taskId: t.id,
        taskTitle: t.title,
        completedAt: l.completedAt.toISOString(),
        rating: l.rating,
        notes: l.notes,
      }))
  );
  return { snapshot, yesterdayKey, yesterdayCompletions };
}
