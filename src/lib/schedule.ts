import { format, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Task, TaskCompletionLog, TaskSchedule } from "@/generated/prisma";
import { getAlertHoursBeforeDue, getTaskHubTimezone } from "@/lib/env";

export type TaskWithRelations = Task & {
  schedules: TaskSchedule[];
  logs: TaskCompletionLog[];
};

export function dateKeyInTz(d: Date, tz: string): string {
  return format(toZonedTime(d, tz), "yyyy-MM-dd");
}

export function yesterdayKeyInTz(now: Date, tz: string): string {
  const z = toZonedTime(now, tz);
  return format(subDays(z, 1), "yyyy-MM-dd");
}

function dueInstantForLocalDay(isoDate: string, hhmm: string | null, tz: string): Date {
  const t = hhmm ?? "23:59";
  return fromZonedTime(`${isoDate}T${t}:00`, tz);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SlotStatus = {
  taskId: string;
  taskTitle: string;
  priority: number;
  dayOfWeek: number;
  dayLabel: string;
  dueTime: string | null;
  dueAt: string;
  dateKey: string;
  completed: boolean;
  /** minutes until due; negative if overdue */
  minutesToDue: number;
  level: "ok" | "due_soon" | "overdue" | "completed";
};

function slotLevel(
  completed: boolean,
  now: Date,
  dueUtc: Date,
  alertHours: number
): SlotStatus["level"] {
  if (completed) return "completed";
  const ms = dueUtc.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= alertHours * 60 * 60 * 1000) return "due_soon";
  return "ok";
}

export function buildSlotStatuses(
  tasks: TaskWithRelations[],
  now: Date = new Date(),
  tz: string = getTaskHubTimezone(),
  alertHours: number = getAlertHoursBeforeDue()
): SlotStatus[] {
  const z = toZonedTime(now, tz);
  const todayKey = format(z, "yyyy-MM-dd");
  const dow = z.getDay();
  const out: SlotStatus[] = [];

  for (const task of tasks) {
    if (!task.active) continue;
    for (const sch of task.schedules) {
      if (sch.dayOfWeek !== dow) continue;

      const completed = task.logs.some((l) => dateKeyInTz(l.completedAt, tz) === todayKey);
      const dueUtc = dueInstantForLocalDay(todayKey, sch.dueTime, tz);
      const minutesToDue = Math.round((dueUtc.getTime() - now.getTime()) / 60000);
      const level = slotLevel(completed, now, dueUtc, alertHours);

      out.push({
        taskId: task.id,
        taskTitle: task.title,
        priority: task.priority,
        dayOfWeek: sch.dayOfWeek,
        dayLabel: WEEKDAYS[sch.dayOfWeek],
        dueTime: sch.dueTime,
        dueAt: dueUtc.toISOString(),
        dateKey: todayKey,
        completed,
        minutesToDue,
        level,
      });
    }
  }

  out.sort((a, b) => {
    if (a.level === "overdue" && b.level !== "overdue") return -1;
    if (b.level === "overdue" && a.level !== "overdue") return 1;
    if (a.level === "due_soon" && b.level !== "due_soon" && b.level !== "overdue") return -1;
    if (b.level === "due_soon" && a.level !== "due_soon" && a.level !== "overdue") return 1;
    return b.priority - a.priority || a.minutesToDue - b.minutesToDue;
  });

  return out;
}

export function snapshotForAgents(
  tasks: TaskWithRelations[],
  now: Date = new Date(),
  tz: string = getTaskHubTimezone()
) {
  const slots = buildSlotStatuses(tasks, now, tz);
  const incomplete = slots.filter((s) => !s.completed);
  const dueSoon = incomplete.filter((s) => s.level === "due_soon");
  const overdue = incomplete.filter((s) => s.level === "overdue");
  const completedToday = slots.filter((s) => s.completed);

  const recentLogs = tasks
    .flatMap((t) =>
      t.logs.map((l) => ({
        taskId: t.id,
        taskTitle: t.title,
        completedAt: l.completedAt.toISOString(),
        rating: l.rating,
        notes: l.notes,
      }))
    )
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 50);

  return {
    generatedAt: now.toISOString(),
    timezone: tz,
    todayKey: dateKeyInTz(now, tz),
    counts: {
      incomplete: incomplete.length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      completedToday: completedToday.length,
    },
    slots,
    recentLogs,
  };
}
