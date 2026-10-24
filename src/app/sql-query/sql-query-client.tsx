"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";
import { readJsonResponse } from "@/lib/readJsonResponse";

type Result = {
  sql: string;
  explanation: string;
  tablesReferenced: string[];
  review: { approved: boolean; severity: string; issues: string[]; suggestions: string };
};

const DIALECTS = ["PostgreSQL", "MySQL", "SQLite", "SQL Server"];

export function SqlQueryClient() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();
  const getAIHeaders = useOpenAIFetchHeaders();
  const [question, setQuestion] = useState("");
  const [schemaContext, setSchemaContext] = useState("");
  const [dialect, setDialect] = useState("PostgreSQL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/sql-query",
      viewLabel: "SQL Query",
      summary: "Generate reviewed, read-only SQL from a plain-language request. Choose a dialect and optionally paste table and column details for accurate queries.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  async function generate() {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/sql-query/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAIHeaders() },
        body: JSON.stringify({ question, dialect, schemaContext }),
      });
      const data = await readJsonResponse<Result & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "SQL generation failed");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "SQL generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function copySql() {
    if (!result) return;
    await navigator.clipboard.writeText(result.sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">Database utility</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">SQL Query</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
          Describe the data you need, select your dialect, and add schema context for precise table and column names. Queries are reviewed and never executed here.
        </p>
      </header>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5 sm:p-6">
          <label className="block text-sm text-zinc-300">
            SQL dialect
            <select value={dialect} onChange={(event) => setDialect(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100">
              {DIALECTS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Request
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={5} placeholder="Show monthly revenue by customer for the last year" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100 placeholder:text-zinc-600" />
          </label>
          <label className="block text-sm text-zinc-300">
            Schema context <span className="text-zinc-400">(optional)</span>
            <textarea value={schemaContext} onChange={(event) => setSchemaContext(event.target.value)} rows={7} placeholder={"customers(id, name)\ninvoices(id, customer_id, total, issued_at)"} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-600" />
          </label>
          <button type="button" onClick={() => void generate()} disabled={busy || !question.trim()} className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "Generating and reviewing..." : "Generate SQL"}
          </button>
          {error && <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        </section>

        <section className="min-h-80 rounded-2xl border border-zinc-800 bg-black/25 p-5 sm:p-6">
          {!result ? <p className="text-sm text-zinc-400">Your reviewed query will appear here.</p> : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Generated SQL</p>
                <button type="button" onClick={() => void copySql()} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white">{copied ? "Copied" : "Copy"}</button>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">{result.sql}</pre>
              <p className="text-sm leading-relaxed text-zinc-400">{result.explanation}</p>
              <div className={`rounded-lg border p-3 text-sm ${result.review.approved ? "border-emerald-500/30 bg-emerald-950/25 text-emerald-200" : "border-amber-500/40 bg-amber-950/25 text-amber-200"}`}>
                <p className="font-medium">Review: {result.review.approved ? "Approved" : "Needs attention"}</p>
                {result.review.issues.length > 0 && <ul className="mt-2 list-inside list-disc text-xs">{result.review.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
                {result.review.suggestions && <p className="mt-2 text-xs opacity-80">{result.review.suggestions}</p>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}