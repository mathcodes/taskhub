"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatIsoDateTimeUtc } from "@/lib/formatIsoDateTime";
import { readJsonResponse } from "@/lib/readJsonResponse";

type FormData = {
  name: string;
  age: string;
  income: string;
  occupation: string;
  yearsExperience: string;
  education: string;
  goals: string;
};

type LogEntry = { timestamp: string; message: string; type: string };
type DialogueEntry = { timestamp: string; agent: string; message: string };

type FinalReport = {
  greeting: string;
  investigation: string;
  administration: string;
  finalGrade: string;
};

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"
      />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H6l-2 2V4h16v12z"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function formatLogTime(iso: string) {
  try {
    return formatIsoDateTimeUtc(iso);
  } catch {
    return iso;
  }
}

export function MultiAgentAssessmentClient() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    income: "",
    occupation: "",
    yearsExperience: "",
    education: "",
    goals: "",
  });
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [agentDialogues, setAgentDialogues] = useState<DialogueEntry[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, agentDialogues]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    setProcessing(true);
    setLogs([]);
    setAgentDialogues([]);
    setFinalReport(null);
    try {
      const res = await fetch("/api/multi-agent-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await readJsonResponse<{
        error?: string;
        logs?: LogEntry[];
        dialogues?: DialogueEntry[];
        finalReport?: FinalReport;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.logs) setLogs(data.logs);
      if (data.dialogues) setAgentDialogues(data.dialogues);
      if (data.finalReport) setFinalReport(data.finalReport);
    } catch (e) {
      setLogs([
        {
          timestamp: new Date().toISOString(),
          message: e instanceof Error ? e.message : "Request failed",
          type: "error",
        },
      ]);
    } finally {
      setProcessing(false);
    }
  }

  function downloadLogs() {
    const logContent = logs
      .map((log) => `[${formatLogTime(log.timestamp)}] [${log.type.toUpperCase()}] ${log.message}`)
      .join("\n");
    const dialogueContent =
      "\n\n=== AGENT DIALOGUES ===\n\n" +
      agentDialogues
        .map((d) => `[${formatLogTime(d.timestamp)}] ${d.agent}:\n${d.message}\n`)
        .join("\n");
    const fullLog = logContent + dialogueContent;
    const blob = new Blob([fullLog], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Task Hub · Multi-agent assessment
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <IconUsers className="text-indigo-400" />
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Multi-Agent Assessment System
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Claude-powered form review: concierge greeting, investigator, administrator, and a five-agent grading
        committee. Requires <code className="font-mono text-xs text-zinc-500">ANTHROPIC_API_KEY</code> on the server.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/taskhub" className="text-teal-400 hover:text-teal-300">
          ← Back to Task Hub
        </Link>
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-zinc-100">
            <IconFile className="text-zinc-400" />
            Assessment form
          </h2>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase text-zinc-500">Full name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Age</span>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Annual income</span>
                <input
                  type="text"
                  name="income"
                  value={formData.income}
                  onChange={handleInputChange}
                  placeholder="$50,000"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium uppercase text-zinc-500">Occupation</span>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Years experience</span>
                <input
                  type="number"
                  name="yearsExperience"
                  value={formData.yearsExperience}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase text-zinc-500">Education</span>
                <select
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select…</option>
                  <option value="High School">High school</option>
                  <option value="Associate">Associate degree</option>
                  <option value="Bachelor">Bachelor&apos;s</option>
                  <option value="Master">Master&apos;s</option>
                  <option value="PhD">PhD</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium uppercase text-zinc-500">Career goals</span>
              <textarea
                name="goals"
                value={formData.goals}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={processing}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-medium text-white hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Running assessment…" : "Submit for multi-agent assessment"}
            </button>
          </div>

          <div className="mt-6 space-y-2 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
            <p className="text-xs font-medium uppercase text-zinc-500">Pipeline</p>
            <div className="flex items-center gap-2">
              <span className={processing ? "text-indigo-400" : finalReport ? "text-emerald-400" : ""}>
                {finalReport ? <IconCheck className="inline h-4 w-4" /> : "1."}
              </span>
              Concierge
            </div>
            <div className="flex items-center gap-2">
              <span className={processing ? "text-indigo-400" : finalReport ? "text-emerald-400" : ""}>
                {finalReport ? <IconCheck className="inline h-4 w-4" /> : "2."}
              </span>
              Investigator
            </div>
            <div className="flex items-center gap-2">
              <span className={processing ? "text-indigo-400" : finalReport ? "text-emerald-400" : ""}>
                {finalReport ? <IconCheck className="inline h-4 w-4" /> : "3."}
              </span>
              Administrator
            </div>
            <div className="flex items-center gap-2">
              <span className={processing ? "text-indigo-400" : finalReport ? "text-emerald-400" : ""}>
                {finalReport ? <IconCheck className="inline h-4 w-4" /> : "4."}
              </span>
              Grading committee (5 agents)
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-100">
                <IconAlert className="text-amber-400/90" />
                System logs
              </h2>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={downloadLogs}
                  className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Download logs
                </button>
              )}
            </div>
            <div
              ref={logContainerRef}
              className="h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-xs"
            >
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.type === "header"
                      ? "font-bold text-amber-200"
                      : log.type === "info"
                        ? "text-sky-300/90"
                        : log.type === "success"
                          ? "text-emerald-400/90"
                          : log.type === "error"
                            ? "text-rose-400"
                            : log.type === "processing"
                              ? "text-violet-300/90"
                              : log.type === "dialogue"
                                ? "text-cyan-300/80"
                                : "text-zinc-400"
                  }
                >
                  [{formatLogTime(log.timestamp)}] {log.message}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-zinc-100">
              <IconMessage className="text-zinc-400" />
              Agent dialogues
            </h2>
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-black/40 p-3">
              {agentDialogues.map((dialogue, idx) => (
                <div key={idx} className="rounded-lg border-l-4 border-indigo-500/60 bg-zinc-900/50 p-3">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-indigo-300/90">{dialogue.agent}</span>
                    <span className="text-[10px] text-zinc-600">{formatLogTime(dialogue.timestamp)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{dialogue.message}</p>
                </div>
              ))}
              {agentDialogues.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-600">Agent output will appear here after you submit.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {finalReport && (
        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-zinc-50">
            <IconCheck className="text-emerald-400" />
            Final assessment report
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="mb-2 font-medium text-indigo-300/90">Investigator findings</h3>
              <p className="text-sm leading-relaxed text-zinc-300">{finalReport.investigation}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="mb-2 font-medium text-indigo-300/90">Administrator analysis</h3>
              <p className="text-sm leading-relaxed text-zinc-300">{finalReport.administration}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:col-span-2">
              <h3 className="mb-2 text-lg font-medium text-emerald-300/90">Committee final decision</h3>
              <p className="leading-relaxed text-zinc-200">{finalReport.finalGrade}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
