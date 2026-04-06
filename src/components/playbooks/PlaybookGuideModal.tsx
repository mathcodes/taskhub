"use client";

import { useEffect, useId } from "react";

export type GuideStep = {
  index: number;
  title: string;
  instruction: string;
  guidance: string;
  recordHint: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  department: string | null;
  batchLabel: string | null;
  steps: GuideStep[];
  /** Shown in header badge */
  variant?: "preview" | "post-assignment";
};

/** Horizontal bar chart: bar height ∝ detail (instruction + guidance + record hints). */
function StepsBarChart({ steps }: { steps: GuideStep[] }) {
  if (steps.length === 0) return null;
  const weights = steps.map((s) => {
    const n =
      s.instruction.length + s.guidance.length + (s.recordHint === "None" ? 0 : s.recordHint.length);
    return Math.max(1, n);
  });
  const maxW = Math.max(...weights);
  const maxPx = 112;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Workflow overview</p>
      <p className="mt-1 text-xs text-zinc-600">
        Bar height reflects how much detail each step has (instruction + guidance + what to record).
      </p>
      <div className="mt-4 flex h-[120px] items-end gap-1.5 border-b border-zinc-800/80 pb-0.5">
        {steps.map((s, i) => {
          const px = Math.max(14, (weights[i]! / maxW) * maxPx);
          return (
            <div
              key={s.index}
              className="group flex min-w-[8px] flex-1 flex-col items-stretch justify-end"
              title={s.title}
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-amber-700/90 to-amber-400/80 transition group-hover:from-amber-600 group-hover:to-amber-300"
                style={{ height: `${px}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s.index} className="min-w-0 flex-1 text-center">
            <span className="text-[10px] text-zinc-600">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cumulative “detail” across steps (instruction + guidance length) — line chart. */
function CumulativeDetailChart({ steps }: { steps: GuideStep[] }) {
  if (steps.length < 2) return null;
  const weights = steps.map((s) => {
    const n =
      s.instruction.length + s.guidance.length + (s.recordHint === "None" ? 0 : s.recordHint.length);
    return Math.max(1, n);
  });
  let acc = 0;
  const cumulative = weights.map((w) => {
    acc += w;
    return acc;
  });
  const maxY = Math.max(...cumulative, 1);
  const w = 320;
  const h = 80;
  const pad = 8;
  const pts = cumulative.map((y, i) => {
    const x = pad + (i / Math.max(1, cumulative.length - 1)) * (w - pad * 2);
    const yy = h - pad - (y / maxY) * (h - pad * 2);
    return `${x},${yy}`;
  });
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Cumulative detail</p>
      <p className="mt-1 text-xs text-zinc-600">
        Running total of guidance text as you move through the checklist (step order on the horizontal axis).
      </p>
      <svg
        className="mt-3 w-full max-w-md text-amber-400/90"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          points={pts.join(" ")}
        />
        {cumulative.map((y, i) => {
          const x = pad + (i / Math.max(1, cumulative.length - 1)) * (w - pad * 2);
          const yy = h - pad - (y / maxY) * (h - pad * 2);
          return <circle key={steps[i]!.index} cx={x} cy={yy} r="3" fill="currentColor" />;
        })}
      </svg>
    </div>
  );
}

export function PlaybookGuideModal({
  open,
  onClose,
  title,
  department,
  batchLabel,
  steps,
  variant = "preview",
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col rounded-t-2xl border border-zinc-700 bg-zinc-950 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4 sm:px-6">
          <div>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                variant === "post-assignment"
                  ? "bg-emerald-950/80 text-emerald-300/90"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {variant === "post-assignment" ? "Assignment sent" : "Supervisor preview"}
            </span>
            <h2 id={titleId} className="mt-2 text-xl font-semibold text-zinc-50 sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {department ? `${department}` : "Department not set"}
              {batchLabel ? ` · ${batchLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <StepsBarChart steps={steps} />
            <CumulativeDetailChart steps={steps} />
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-3 py-2.5 font-medium text-zinc-400">#</th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">Step</th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">Do this</th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">Record / proof</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={s.index} className="border-b border-zinc-800/80 last:border-0">
                    <td className="align-top px-3 py-3 font-mono text-xs text-amber-400/90">{i + 1}</td>
                    <td className="align-top px-3 py-3 font-medium text-zinc-200">{s.title}</td>
                    <td className="align-top px-3 py-3 text-zinc-400">{s.instruction}</td>
                    <td className="align-top px-3 py-3 text-zinc-500">{s.recordHint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Detailed walkthrough
            </h3>
            <ol className="space-y-4">
              {steps.map((s, i) => (
                <li
                  key={s.index}
                  className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-sm text-amber-400/90">Step {i + 1}</span>
                    <span className="text-lg font-semibold text-zinc-100">{s.title}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-amber-200/80">What to do</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{s.instruction}</p>
                  <p className="mt-4 text-sm font-medium text-zinc-500">Guidance</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.guidance}</p>
                  {s.recordHint && s.recordHint !== "None" && (
                    <>
                      <p className="mt-4 text-sm font-medium text-emerald-400/80">What to record</p>
                      <p className="mt-1 text-sm text-zinc-400">{s.recordHint}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
