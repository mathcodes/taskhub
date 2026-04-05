"use client";

import { useState } from "react";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";
import { readJsonResponse } from "@/lib/readJsonResponse";

type BossResponse = {
  question: string;
  retrieval: {
    schema: { tables: string[]; dictionaryRowsUsed: number };
    examples: { ids: string[]; count: number };
    docs: { paths: string[]; count: number };
  };
  stages: {
    examples: Record<string, unknown>;
    sql: Record<string, unknown>;
    docs: Record<string, unknown>;
  };
  synthesis: Record<string, unknown>;
};

export function BossRulePanel() {
  const getAIHeaders = useOpenAIFetchHeaders();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<BossResponse | null>(null);
  const [showStages, setShowStages] = useState(false);

  async function run() {
    const question = q.trim();
    if (!question) return;
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const res = await fetch("/api/p21/boss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ question }),
      });
      const data = await readJsonResponse<BossResponse & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOut(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-xs font-medium uppercase text-zinc-500">Business rule request</span>
        <textarea
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          rows={4}
          placeholder='e.g. "Require manager approval on any return over $500 for non-stock items"'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy || !q.trim()}
        onClick={() => void run()}
        className="rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-fuchsia-500 disabled:opacity-50"
      >
        {busy ? "Running agents…" : "Generate rule spec"}
      </button>

      {err && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {err}
        </div>
      )}

      {out && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">Retrieval</p>
            <p className="mt-2 text-xs text-zinc-500">
              Schema rows: {out.retrieval.schema.dictionaryRowsUsed} · Tables:{" "}
              {out.retrieval.schema.tables.length ? out.retrieval.schema.tables.join(", ") : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Examples matched: {out.retrieval.examples.count}
              {out.retrieval.examples.ids.length ? ` (${out.retrieval.examples.ids.join(", ")})` : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Doc chunks: {out.retrieval.docs.count}
              {out.retrieval.docs.paths.length ? ` — ${out.retrieval.docs.paths.join(", ")}` : ""}
            </p>
          </div>

          <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-4">
            <p className="text-xs font-medium uppercase text-fuchsia-400/90">Synthesis (final spec)</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-zinc-200">
              {JSON.stringify(out.synthesis, null, 2)}
            </pre>
          </div>

          <button
            type="button"
            onClick={() => setShowStages((s) => !s)}
            className="text-sm text-zinc-500 underline decoration-zinc-600 hover:text-zinc-300"
          >
            {showStages ? "Hide" : "Show"} intermediate agent JSON (examples · SQL · docs)
          </button>
          {showStages && (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-black/30 p-4">
              <p className="text-xs font-medium text-zinc-500">Stage 1 — Examples understanding</p>
              <pre className="max-h-48 overflow-auto font-mono text-[11px] text-zinc-400">
                {JSON.stringify(out.stages.examples, null, 2)}
              </pre>
              <p className="text-xs font-medium text-zinc-500">Stage 2 — SQL rule sketch</p>
              <pre className="max-h-48 overflow-auto font-mono text-[11px] text-zinc-400">
                {JSON.stringify(out.stages.sql, null, 2)}
              </pre>
              <p className="text-xs font-medium text-zinc-500">Stage 3 — Docs grounding</p>
              <pre className="max-h-48 overflow-auto font-mono text-[11px] text-zinc-400">
                {JSON.stringify(out.stages.docs, null, 2)}
              </pre>
            </div>
          )}

          <p className="text-xs text-zinc-600">
            BOSS does not create rules in P21 automatically. Use the spec with your implementation and
            test process.
          </p>
        </div>
      )}
    </div>
  );
}
