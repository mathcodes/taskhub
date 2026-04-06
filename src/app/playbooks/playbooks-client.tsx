"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  PlaybookGuideModal,
  type GuideStep,
} from "@/components/playbooks/PlaybookGuideModal";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

type TemplateRow = {
  id: string;
  title: string;
  department: string | null;
  createdAt: string;
  stepCount: number;
};

const SAMPLE_JSON = `{
  "version": 1,
  "title": "Open receiving — inbound",
  "department": "Warehouse",
  "steps": [
    { "text": "Verify PO number matches the BOL." },
    { "text": "Count cartons and note discrepancies on the receiver." },
    { "text": "Stage freight in the correct zone before system entry." }
  ]
}`;

export function PlaybooksClient() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();
  const getAIHeaders = useOpenAIFetchHeaders();

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState(SAMPLE_JSON);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [assignPlaybookId, setAssignPlaybookId] = useState("");
  const [assignLabel, setAssignLabel] = useState("");
  const [workers, setWorkers] = useState([{ displayName: "", email: "", phone: "" }]);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignResult, setAssignResult] = useState<Record<string, unknown> | null>(null);

  /** Loaded when a playbook is selected — lets supervisors preview steps before assigning. */
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewDepartment, setPreviewDepartment] = useState<string | null>(null);
  const [previewSteps, setPreviewSteps] = useState<GuideStep[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  /** Set after a successful “Assign & notify” — unlocks the post-assignment walkthrough button. */
  const [postAssignGuide, setPostAssignGuide] = useState<{
    title: string;
    department: string | null;
    label: string | null;
    steps: GuideStep[];
  } | null>(null);

  type ModalState =
    | { open: false }
    | {
        open: true;
        variant: "preview" | "post-assignment";
        title: string;
        department: string | null;
        batchLabel: string | null;
        steps: GuideStep[];
      };
  const [modal, setModal] = useState<ModalState>({ open: false });

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch("/api/playbooks/templates");
      const data = await readJsonResponse<{ templates?: TemplateRow[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const list = data.templates as TemplateRow[];
      setTemplates(list);
      setAssignPlaybookId((prev) => prev || list[0]?.id || "");
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/playbooks",
      viewLabel: "Department playbooks",
      summary:
        "Supervisors upload JSON playbooks; the app expands steps with an agent. Pick a playbook to preview the full walkthrough, assign workers, then open the walkthrough again after links are sent. Workers use their private links to complete steps.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  useEffect(() => {
    if (!assignPlaybookId) {
      setPreviewTitle(null);
      setPreviewDepartment(null);
      setPreviewSteps([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/playbooks/templates/${encodeURIComponent(assignPlaybookId)}`);
        const data = await readJsonResponse<{
          error?: string;
          title?: string;
          department?: string | null;
          steps?: GuideStep[];
        }>(res);
        if (cancelled) return;
        if (!res.ok) {
          setPreviewTitle(null);
          setPreviewSteps([]);
          return;
        }
        setPreviewTitle(typeof data.title === "string" ? data.title : null);
        setPreviewDepartment(data.department ?? null);
        setPreviewSteps(Array.isArray(data.steps) ? data.steps : []);
      } catch {
        if (!cancelled) {
          setPreviewSteps([]);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignPlaybookId]);

  async function createTemplate() {
    setCreateBusy(true);
    setCreateMsg(null);
    try {
      const res = await fetch("/api/playbooks/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ rawJson }),
      });
      const data = await readJsonResponse<{
        error?: string;
        id?: string;
        title?: string;
        steps?: unknown[];
      }>(res);
      if (!res.ok) throw new Error(data.error || "Create failed");
      setCreateMsg(
        `Saved “${data.title ?? "playbook"}” with ${Array.isArray(data.steps) ? data.steps.length : "?"} steps.`
      );
      await load();
      if (typeof data.id === "string") setAssignPlaybookId(data.id);
    } catch (e) {
      setCreateMsg(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreateBusy(false);
    }
  }

  async function submitAssignment() {
    setAssignBusy(true);
    setAssignResult(null);
    setPostAssignGuide(null);
    try {
      const res = await fetch("/api/playbooks/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbookId: assignPlaybookId,
          label: assignLabel.trim() || undefined,
          workers: workers
            .filter((w) => w.displayName.trim())
            .map((w) => ({
              displayName: w.displayName.trim(),
              email: w.email.trim() || undefined,
              phone: w.phone.trim() || undefined,
            })),
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        assignmentId?: string;
        playbookTitle?: string;
        playbookDepartment?: string | null;
        assignmentLabel?: string | null;
        steps?: GuideStep[];
      }>(res);
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      setAssignResult(data);
      const steps = Array.isArray(data.steps) ? data.steps : [];
      if (typeof data.playbookTitle === "string" && steps.length > 0) {
        setPostAssignGuide({
          title: data.playbookTitle,
          department: data.playbookDepartment ?? null,
          label: data.assignmentLabel ?? null,
          steps,
        });
      }
    } catch (e) {
      setAssignResult({ error: e instanceof Error ? e.message : "Assignment failed" });
    } finally {
      setAssignBusy(false);
    }
  }

  function addWorkerRow() {
    setWorkers((w) => [...w, { displayName: "", email: "", phone: "" }]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:py-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Department playbooks</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Upload instructions as JSON (see <code className="font-mono text-xs text-zinc-500">docs/playbooks/FORMAT.md</code>
          ). The agent expands each line into a full walkthrough. <strong className="font-medium text-zinc-300">Select a
          playbook</strong> to preview the step-by-step guide; then add workers and send links. After assignment
          succeeds, <strong className="font-medium text-zinc-300">Open walkthrough (sent)</strong> shows the same guide
          with your batch label—use it to brief the team or print from the browser.
        </p>
      </header>

      {loadErr && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {loadErr}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg">
        <h2 className="text-lg font-medium text-zinc-100">1. Create playbook</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Paste JSON or edit the sample. Requires an OpenAI key (header BYOK or server env).
        </p>
        <textarea
          className="mt-4 w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 font-mono text-xs text-zinc-200"
          rows={14}
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
        />
        <button
          type="button"
          disabled={createBusy}
          onClick={() => void createTemplate()}
          className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {createBusy ? "Expanding with agent…" : "Save & expand playbook"}
        </button>
        {createMsg && <p className="mt-3 text-sm text-zinc-400">{createMsg}</p>}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg">
        <h2 className="text-lg font-medium text-zinc-100">2. Assign workers</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Each person gets email (Resend) and/or SMS (Twilio) if configured in environment variables. Choose a playbook
          first—you can <strong className="text-zinc-400">Preview walkthrough</strong> to see the expanded steps, table
          summary, and overview chart before sending.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-zinc-400">
            Playbook
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={assignPlaybookId}
              onChange={(e) => setAssignPlaybookId(e.target.value)}
            >
              <option value="">—</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.stepCount} steps)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-400">
            Batch / shift label (optional)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={assignLabel}
              onChange={(e) => setAssignLabel(e.target.value)}
              placeholder="e.g. Dock A — night crew"
            />
          </label>
        </div>
        <div className="mt-6 space-y-4">
          <p className="text-xs font-medium uppercase text-zinc-500">Workers</p>
          {workers.map((w, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-zinc-800/80 p-3 sm:grid-cols-3">
              <input
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Name"
                value={w.displayName}
                onChange={(e) => {
                  const n = [...workers];
                  n[i] = { ...n[i], displayName: e.target.value };
                  setWorkers(n);
                }}
              />
              <input
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Email"
                type="email"
                value={w.email}
                onChange={(e) => {
                  const n = [...workers];
                  n[i] = { ...n[i], email: e.target.value };
                  setWorkers(n);
                }}
              />
              <input
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Phone (E.164 or US 10-digit)"
                value={w.phone}
                onChange={(e) => {
                  const n = [...workers];
                  n[i] = { ...n[i], phone: e.target.value };
                  setWorkers(n);
                }}
              />
            </div>
          ))}
        <button
          type="button"
          onClick={addWorkerRow}
          className="text-sm text-amber-400/90 hover:text-amber-300"
        >
          + Add worker
        </button>
        </div>

        <button
          type="button"
          disabled={assignBusy || !assignPlaybookId}
          onClick={() => void submitAssignment()}
          className="mt-6 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {assignBusy ? "Sending…" : "Assign & notify"}
        </button>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={
              !assignPlaybookId || previewLoading || previewSteps.length === 0 || !previewTitle
            }
            onClick={() =>
              setModal({
                open: true,
                variant: "preview",
                title: previewTitle!,
                department: previewDepartment,
                batchLabel: assignLabel.trim() || null,
                steps: previewSteps,
              })
            }
            className="rounded-xl border border-amber-600/50 bg-amber-950/40 px-5 py-2.5 text-sm font-medium text-amber-100 hover:border-amber-500/70 hover:bg-amber-950/60 disabled:opacity-40"
          >
            {previewLoading ? "Loading steps…" : "Preview walkthrough"}
          </button>
          <button
            type="button"
            disabled={assignBusy || !postAssignGuide || postAssignGuide.steps.length === 0}
            onClick={() =>
              setModal({
                open: true,
                variant: "post-assignment",
                title: postAssignGuide!.title,
                department: postAssignGuide!.department,
                batchLabel: postAssignGuide!.label,
                steps: postAssignGuide!.steps,
              })
            }
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Open walkthrough (sent)
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          <strong className="text-zinc-500">Open walkthrough (sent)</strong> becomes available after{" "}
          <strong className="text-zinc-500">Assign &amp; notify</strong> succeeds. It opens a full-screen guide with an
          overview chart, summary table, and detailed steps—same content as{" "}
          <strong className="text-zinc-500">Preview walkthrough</strong>, plus your batch label when applicable.
        </p>
        {assignResult !== null && (
          <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-zinc-300">
            {JSON.stringify(assignResult, null, 2)}
          </pre>
        )}
      </section>

      {modal.open ? (
        <PlaybookGuideModal
          open
          onClose={() => setModal({ open: false })}
          title={modal.title}
          department={modal.department}
          batchLabel={modal.batchLabel}
          steps={modal.steps}
          variant={modal.variant}
        />
      ) : null}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Saved playbooks</h2>
        <ul className="mt-3 divide-y divide-zinc-800 border border-zinc-800 rounded-xl">
          {templates.length === 0 ? (
            <li className="px-4 py-6 text-sm text-zinc-500">No playbooks yet.</li>
          ) : (
            templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-zinc-200">{t.title}</span>
                <span className="text-zinc-500">
                  {t.stepCount} steps
                  {t.department ? ` · ${t.department}` : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <summary className="cursor-pointer text-zinc-300">Upload format (v1)</summary>
        <pre className="mt-3 overflow-x-auto font-mono text-xs text-zinc-500">{SAMPLE_JSON}</pre>
      </details>
    </div>
  );
}
