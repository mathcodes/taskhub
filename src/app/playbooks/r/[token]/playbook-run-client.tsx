"use client";

import { useCallback, useEffect, useState } from "react";
import { formatIsoDateTimeUtc } from "@/lib/formatIsoDateTime";
import { readJsonResponse } from "@/lib/readJsonResponse";

type Step = {
  index: number;
  title: string;
  instruction: string;
  guidance: string;
  recordHint: string;
};

type ProgressEntry = { done: boolean; note: string | null; completedAt: string };

type Payload = {
  worker: {
    displayName: string;
    playbookTitle: string;
    department: string | null;
    assignmentLabel: string | null;
  };
  run: { id: string; status: string; startedAt: string | null; completedAt: string | null };
  steps: Step[];
  progress: Record<string, ProgressEntry>;
};

export function PlaybookRunClient({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/playbooks/worker/${encodeURIComponent(token)}`);
      const j = await readJsonResponse<Payload & { error?: string }>(res);
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setData(j as Payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err && !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-rose-300">{err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return <PlaybookRunBody token={token} data={data} reload={load} />;
}

function PlaybookRunBody({
  token,
  data,
  reload,
}: {
  token: string;
  data: Payload;
  reload: () => Promise<void>;
}) {
  const progress = data.progress ?? {};
  const [notes, setNotes] = useState<Record<number, string>>(() => {
    const n: Record<number, string> = {};
    for (const s of data.steps) {
      const p = progress[String(s.index)];
      if (p?.note) n[s.index] = p.note;
    }
    return n;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const n: Record<number, string> = {};
    for (const s of data.steps) {
      const p = data.progress[String(s.index)];
      if (p?.note) n[s.index] = p.note;
    }
    setNotes(n);
  }, [data]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/playbooks/worker/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(j.error || "Update failed");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Your checklist</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">{data.worker.playbookTitle}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {data.worker.displayName}
          {data.worker.department ? ` · ${data.worker.department}` : ""}
          {data.worker.assignmentLabel ? ` · ${data.worker.assignmentLabel}` : ""}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Status: {data.run.status}
          {data.run.completedAt ? ` · Completed ${formatIsoDateTimeUtc(data.run.completedAt)}` : ""}
        </p>
      </header>

      {data.run.status === "pending" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void patch({ action: "start" })}
          className="mb-8 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          Start checklist
        </button>
      )}

      {err && (
        <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
          {err}
        </div>
      )}

      <ol className="space-y-6">
        {data.steps.map((step) => {
          const p = progress[String(step.index)];
          const done = !!p?.done;
          return (
            <li
              key={step.index}
              className={`rounded-2xl border p-5 ${
                done ? "border-emerald-500/30 bg-emerald-950/20" : "border-zinc-800 bg-zinc-950/80"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-zinc-600"
                    checked={done}
                    disabled={busy}
                    onChange={(e) =>
                      void patch({
                        stepIndex: step.index,
                        done: e.target.checked,
                        note: notes[step.index] ?? p?.note ?? null,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-zinc-100">
                    Step {step.index + 1}: {step.title}
                  </span>
                </label>
              </div>
              <p className="mt-3 text-sm text-zinc-300">{step.instruction}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.guidance}</p>
              {step.recordHint && step.recordHint !== "None" && (
                <p className="mt-2 text-xs text-amber-200/80">Record: {step.recordHint}</p>
              )}
              <textarea
                className="mt-3 w-full rounded-lg border border-zinc-700 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                rows={2}
                placeholder="Notes for this step…"
                value={notes[step.index] ?? p?.note ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [step.index]: e.target.value,
                  }))
                }
                onBlur={() =>
                  void patch({
                    stepIndex: step.index,
                    done,
                    note: notes[step.index] ?? "",
                  })
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
