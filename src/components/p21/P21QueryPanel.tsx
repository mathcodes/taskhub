"use client";

import { useState } from "react";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";

type ApiResponse = {
  question: string;
  sql: string;
  explanation: string;
  tablesReferenced: string[];
  schema: { tablesMatched: string[]; dictionaryRowsUsed: number };
  review: {
    approved: boolean;
    severity: string;
    issues: string[];
    suggestions: string;
  } | null;
};

export function P21QueryPanel() {
  const getAIHeaders = useOpenAIFetchHeaders();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<ApiResponse | null>(null);

  async function run() {
    const question = q.trim();
    if (!question) return;
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const res = await fetch("/api/p21/nl-to-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOut(data as ApiResponse);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-xs font-medium uppercase text-zinc-500">Question</span>
        <textarea
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          rows={4}
          placeholder='e.g. "Show recent invoices by customer for company 1"'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy || !q.trim()}
        onClick={() => void run()}
        className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate SQL"}
      </button>

      {err && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {err}
        </div>
      )}

      {out && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Explanation</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{out.explanation}</p>
            <p className="mt-3 text-xs text-zinc-600">
              Schema rows retrieved: {out.schema.dictionaryRowsUsed} · Tables:{" "}
              {out.schema.tablesMatched.length
                ? out.schema.tablesMatched.join(", ")
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Generated SQL</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-emerald-200/90">
              {out.sql}
            </pre>
          </div>
          {out.review && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                out.review.approved
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-100"
                  : "border-amber-500/40 bg-amber-950/30 text-amber-100"
              }`}
            >
              <p className="font-medium">
                Review: {out.review.approved ? "Approved" : "Flagged"} ({out.review.severity})
              </p>
              {out.review.issues.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs">
                  {out.review.issues.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              )}
              {out.review.suggestions ? (
                <p className="mt-2 text-xs opacity-90">{out.review.suggestions}</p>
              ) : null}
            </div>
          )}
          <p className="text-xs text-zinc-600">
            This SQL is **not** executed here. Run it only on a database you are authorized to
            query, on a non-production environment when exploring.
          </p>
        </div>
      )}
    </div>
  );
}
