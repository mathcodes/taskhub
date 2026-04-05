"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";

const DAYS = [
  { v: 0, l: "Sun" },
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
];

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  priority: number;
  schedules: { id: string; dayOfWeek: number; dueTime: string | null }[];
  logs: {
    id: string;
    completedAt: string;
    rating: number | null;
    notes: string | null;
  }[];
};

type MonitorAgentPayload = {
  alerts: { severity: string; title: string; detail: string; taskId: string | null }[];
  insights: string[];
  focusNext: string[];
};

type Slot = {
  taskId: string;
  taskTitle: string;
  priority: number;
  dayLabel: string;
  dueTime: string | null;
  dueAt: string;
  dateKey: string;
  completed: boolean;
  minutesToDue: number;
  level: string;
};

export function Dashboard() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();
  const getAIHeaders = useOpenAIFetchHeaders();

  const [tab, setTab] = useState<"today" | "tasks" | "log" | "agents">("today");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [snapshotMeta, setSnapshotMeta] = useState<{
    todayKey: string;
    timezone: string;
    counts: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPri, setNewPri] = useState(0);
  const [newSched, setNewSched] = useState<{ dayOfWeek: number; dueTime: string }[]>([
    { dayOfWeek: 1, dueTime: "" },
  ]);

  const [monitorOut, setMonitorOut] = useState<MonitorAgentPayload | null>(null);
  const [dailyMd, setDailyMd] = useState<string | null>(null);
  const [agentBusy, setAgentBusy] = useState<string | null>(null);

  const [completeFor, setCompleteFor] = useState<string | null>(null);
  const [rating, setRating] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/snapshot"),
      ]);
      const tJson = await tRes.json();
      const sJson = await sRes.json();
      if (!tRes.ok) throw new Error(tJson.error || "tasks failed");
      if (!sRes.ok) throw new Error(sJson.error || "snapshot failed");
      setTasks(tJson.tasks);
      setSlots(sJson.snapshot.slots);
      setSnapshotMeta({
        todayKey: sJson.snapshot.todayKey,
        timezone: sJson.snapshot.timezone,
        counts: sJson.snapshot.counts,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener("taskhub:refresh", onRefresh);
    return () => window.removeEventListener("taskhub:refresh", onRefresh);
  }, [load]);

  const allLogs = useMemo(() => {
    const rows: {
      id: string;
      taskTitle: string;
      completedAt: string;
      rating: number | null;
      notes: string | null;
    }[] = [];
    for (const t of tasks) {
      for (const l of t.logs) {
        rows.push({
          id: l.id,
          taskTitle: t.title,
          completedAt: l.completedAt,
          rating: l.rating,
          notes: l.notes,
        });
      }
    }
    rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return rows;
  }, [tasks]);

  const voiceViewLabel = useMemo(() => {
    if (tab === "today") return "Dashboard · Today";
    if (tab === "tasks") return "Dashboard · Tasks";
    if (tab === "log") return "Dashboard · Activity log";
    return "Dashboard · Agents";
  }, [tab]);

  const voiceSummary = useMemo(() => {
    const tz = snapshotMeta?.timezone ?? "UTC";
    const todayKey = snapshotMeta?.todayKey ?? "";
    const counts = snapshotMeta?.counts;
    if (tab === "today") {
      const lines = slots.map(
        (s) =>
          `- ${s.taskTitle}${s.completed ? " (completed today)" : ""} — status ${s.level}; due ${
            s.dueTime ?? "end of day"
          }; ${s.minutesToDue >= 0 ? `${s.minutesToDue} min until due` : `${-s.minutesToDue} min overdue`}`
      );
      return [
        `Timezone: ${tz}. Calendar today: ${todayKey}.`,
        counts
          ? `Counts: ${counts.incomplete ?? "?"} incomplete, ${counts.dueSoon ?? "?"} due soon, ${counts.overdue ?? "?"} overdue.`
          : "",
        `Today's scheduled slots (${slots.length}):`,
        lines.length ? lines.join("\n") : "(none)",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (tab === "tasks") {
      const lines = tasks.map((t) => {
        const sched =
          t.schedules
            .map(
              (s) =>
                `${DAYS.find((d) => d.v === s.dayOfWeek)?.l ?? s.dayOfWeek}${
                  s.dueTime ? ` @ ${s.dueTime}` : ""
                }`
            )
            .join(", ") || "no weekly schedule";
        return `- ${t.title} (priority ${t.priority}, ${t.active ? "active" : "inactive"}) — ${sched}`;
      });
      return [`${tasks.length} tasks:`, ...lines].join("\n");
    }
    if (tab === "log") {
      const sample = allLogs.slice(0, 25).map(
        (l) =>
          `- ${l.taskTitle} at ${new Date(l.completedAt).toLocaleString()}${l.rating != null ? `, rating ${l.rating}/5` : ""}${l.notes ? ` — ${l.notes}` : ""}`
      );
      return [`${allLogs.length} completion log entries (newest listed first, up to 25 shown):`, ...sample].join(
        "\n"
      );
    }
    return [
      "Agents tab: Monitor agent runs a snapshot-based briefing; Daily summary generates Markdown from yesterday's logs and today's snapshot.",
      monitorOut ? "Monitor agent output is present on screen (JSON)." : "Monitor agent has not been run this session.",
      dailyMd ? "Daily summary Markdown is present on screen." : "Daily summary has not been generated this session.",
    ].join("\n");
  }, [tab, tasks, slots, snapshotMeta, allLogs, monitorOut, dailyMd]);

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/",
      viewLabel: voiceViewLabel,
      summary: voiceSummary,
    });
    return () => setVoicePageContext(null);
  }, [pathname, voiceViewLabel, voiceSummary, setVoicePageContext]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPri,
        schedules: newSched.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dueTime: s.dueTime.trim() || null,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "create failed");
      return;
    }
    setNewTitle("");
    setNewDesc("");
    setNewPri(0);
    setNewSched([{ dayOfWeek: 1, dueTime: "" }]);
    await load();
  }

  async function removeTask(id: string) {
    if (!confirm("Delete this task and its logs?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || "delete failed");
      return;
    }
    await load();
  }

  async function submitComplete() {
    if (!completeFor) return;
    const res = await fetch(`/api/tasks/${completeFor}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: rating === "" ? null : rating,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "log failed");
      return;
    }
    setCompleteFor(null);
    setRating("");
    setNotes("");
    await load();
  }

  async function runMonitor() {
    setAgentBusy("monitor");
    setMonitorOut(null);
    try {
      const res = await fetch("/api/agents/monitor", {
        method: "POST",
        headers: getAIHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "monitor failed");
      setMonitorOut(data.agent as MonitorAgentPayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "monitor error");
    } finally {
      setAgentBusy(null);
    }
  }

  async function runDaily() {
    setAgentBusy("daily");
    setDailyMd(null);
    try {
      const res = await fetch("/api/agents/daily", {
        method: "POST",
        headers: getAIHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "daily failed");
      setDailyMd(data.markdown);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "daily error");
    } finally {
      setAgentBusy(null);
    }
  }

  function badge(level: string) {
    if (level === "overdue")
      return "bg-rose-500/20 text-rose-200 border border-rose-500/40";
    if (level === "due_soon")
      return "bg-amber-500/20 text-amber-100 border border-amber-500/40";
    if (level === "completed")
      return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/35";
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-600/50";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Agentic task hub
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
            Schedules, logs, and AI briefings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Define weekly tasks, check them off with optional ratings and notes, and let the monitor
            and daily-summary agents read your snapshot to surface alerts and a written daily
            report. Use the sticky voice bar above for the assistant or dictation into fields.
          </p>
          {snapshotMeta && (
            <p className="mt-4 text-xs text-zinc-500">
              Today ({snapshotMeta.timezone}):{" "}
              <span className="font-mono text-zinc-300">{snapshotMeta.todayKey}</span>
              {snapshotMeta.counts ? (
                <>
                  {" "}
                  · incomplete {snapshotMeta.counts.incomplete ?? "—"} · due soon{" "}
                  {snapshotMeta.counts.dueSoon ?? "—"} · overdue{" "}
                  {snapshotMeta.counts.overdue ?? "—"}
                </>
              ) : null}
            </p>
          )}
        </div>
      </header>

      {err && (
        <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {err}
        </div>
      )}

      <nav className="mb-8 flex flex-wrap gap-2">
        {(
          [
            ["today", "Today"],
            ["tasks", "Tasks"],
            ["log", "Activity log"],
            ["agents", "Agents"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === k
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          Refresh
        </button>
      </nav>

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <>
          {tab === "today" && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-zinc-100">Today&apos;s slots</h2>
              {slots.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No tasks scheduled for this weekday. Add a task with a weekly schedule in the
                  Tasks tab.
                </p>
              ) : (
                <ul className="space-y-3">
                  {slots.map((s) => (
                    <li
                      key={`${s.taskId}-${s.dateKey}-${s.dueAt}`}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-100">{s.taskTitle}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${badge(s.level)}`}
                          >
                            {s.level.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Due {s.dueTime ? `at ${s.dueTime} local` : "by end of day"} ·{" "}
                          {s.minutesToDue >= 0
                            ? `in ${s.minutesToDue} min`
                            : `${-s.minutesToDue} min overdue`}
                        </p>
                      </div>
                      {!s.completed ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCompleteFor(s.taskId);
                            setRating("");
                            setNotes("");
                          }}
                          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                          Log completion
                        </button>
                      ) : (
                        <span className="text-sm text-emerald-400">Done today</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "tasks" && (
            <section className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-lg font-medium text-zinc-100">Add task</h2>
                <form onSubmit={addTask} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <label className="block text-xs font-medium uppercase text-zinc-500">
                    Title
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block text-xs font-medium uppercase text-zinc-500">
                    Description
                    <textarea
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                      rows={2}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium uppercase text-zinc-500">
                    Priority (higher first)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                      value={newPri}
                      onChange={(e) => setNewPri(Number(e.target.value))}
                    />
                  </label>
                  <div>
                    <p className="text-xs font-medium uppercase text-zinc-500">Weekly schedule</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Add one row per weekday block. Optional time uses 24h (HH:MM) in your configured
                      timezone.
                    </p>
                    <div className="mt-3 space-y-2">
                      {newSched.map((row, i) => (
                        <div key={i} className="flex flex-wrap gap-2">
                          <select
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
                            value={row.dayOfWeek}
                            onChange={(e) => {
                              const next = [...newSched];
                              next[i] = { ...next[i], dayOfWeek: Number(e.target.value) };
                              setNewSched(next);
                            }}
                          >
                            {DAYS.map((d) => (
                              <option key={d.v} value={d.v}>
                                {d.l}
                              </option>
                            ))}
                          </select>
                          <input
                            className="min-w-[120px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100"
                            placeholder="09:30 (optional)"
                            value={row.dueTime}
                            onChange={(e) => {
                              const next = [...newSched];
                              next[i] = { ...next[i], dueTime: e.target.value };
                              setNewSched(next);
                            }}
                          />
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-700 px-2 text-zinc-500 hover:text-zinc-300"
                            onClick={() => setNewSched(newSched.filter((_, j) => j !== i))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
                      onClick={() =>
                        setNewSched([...newSched, { dayOfWeek: 3, dueTime: "" }])
                      }
                    >
                      + Add weekday
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white"
                  >
                    Save task
                  </button>
                </form>
              </div>
              <div>
                <h2 className="mb-4 text-lg font-medium text-zinc-100">Your tasks</h2>
                <ul className="space-y-3">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-100">{t.title}</p>
                          {t.description && (
                            <p className="mt-1 text-sm text-zinc-500">{t.description}</p>
                          )}
                          <p className="mt-2 text-xs text-zinc-600">
                            Priority {t.priority} ·{" "}
                            {t.schedules
                              .map(
                                (s) =>
                                  `${DAYS.find((d) => d.v === s.dayOfWeek)?.l ?? s.dayOfWeek}${
                                    s.dueTime ? ` @ ${s.dueTime}` : ""
                                  }`
                              )
                              .join(", ") || "no schedule"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTask(t.id)}
                          className="text-xs text-zinc-600 hover:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {tab === "log" && (
            <section>
              <h2 className="mb-4 text-lg font-medium text-zinc-100">Completion log</h2>
              {allLogs.length === 0 ? (
                <p className="text-sm text-zinc-500">No completions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {allLogs.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-200">{l.taskTitle}</span>
                      <span className="mx-2 text-zinc-600">·</span>
                      <span className="font-mono text-xs text-zinc-500">
                        {new Date(l.completedAt).toLocaleString()}
                      </span>
                      {l.rating != null && (
                        <span className="ml-2 text-amber-200/90">★ {l.rating}/5</span>
                      )}
                      {l.notes && <p className="mt-1 text-zinc-500">{l.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "agents" && (
            <section className="space-y-10">
              <div>
                <h2 className="text-lg font-medium text-zinc-100">Monitor agent</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Sends your live snapshot (tasks, today&apos;s slots, recent logs) to the model and
                  returns prioritized alerts and focus items.
                </p>
                <button
                  type="button"
                  disabled={!!agentBusy}
                  onClick={() => void runMonitor()}
                  className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {agentBusy === "monitor" ? "Running…" : "Run monitor agent"}
                </button>
                {monitorOut && (
                  <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-zinc-800 bg-black/40 p-4 text-xs text-zinc-300">
                    {JSON.stringify(monitorOut, null, 2)}
                  </pre>
                )}
              </div>
              <div>
                <h2 className="text-lg font-medium text-zinc-100">Daily summary agent</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Builds a Markdown brief using yesterday&apos;s completions and today&apos;s
                  Requires an OpenAI API key: use the <strong className="font-medium text-zinc-300">API key</strong>{" "}
                  control (top right) to save your own in this browser, or set{" "}
                  <code className="rounded bg-zinc-800 px-1">OPENAI_API_KEY</code> on the server.
                </p>
                <button
                  type="button"
                  disabled={!!agentBusy}
                  onClick={() => void runDaily()}
                  className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {agentBusy === "daily" ? "Writing…" : "Generate daily summary"}
                </button>
                {dailyMd && (
                  <article className="mt-4 max-w-none rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                      {dailyMd}
                    </div>
                  </article>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {completeFor && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-medium text-zinc-50">Log completion</h3>
            <p className="mt-1 text-sm text-zinc-500">Optional metadata is stored with your log.</p>
            <label className="mt-4 block text-xs font-medium text-zinc-500">
              Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-zinc-500">
              Notes
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                onClick={() => setCompleteFor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                onClick={() => void submitComplete()}
              >
                Save log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
