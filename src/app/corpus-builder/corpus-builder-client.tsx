"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";
import { readJsonResponse } from "@/lib/readJsonResponse";

type RunResponse = {
  runId: string;
  agentLog: string[];
  outputFiles: readonly string[];
  manifest: {
    runId: string;
    createdAt: string;
    sources: { label: string; kind: string; hadError: boolean }[];
  };
};

export function CorpusBuilderClient() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();
  const getAIHeaders = useOpenAIFetchHeaders();

  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/corpus-builder",
      viewLabel: "Corpus builder",
      summary:
        "Upload PDFs, Office files, images, text, or paste HTTPS URLs. Click Run: agents extract text, then Source Analyst, Corpus Synthesis, and Reference Index produce downloadable training-corpus.md, source-cards.md, and reference-index.json. Original uploads are deleted from the server after extraction.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  const onRun = useCallback(async () => {
    setErr(null);
    setResult(null);
    const list = files;
    const hasFiles = list && list.length > 0;
    const hasUrls = urls.trim().length > 0;
    if (!hasFiles && !hasUrls) {
      setErr("Add at least one file or one URL.");
      return;
    }

    const fd = new FormData();
    if (hasFiles && list) {
      for (let i = 0; i < list.length; i++) {
        fd.append("files", list[i]);
      }
    }
    if (hasUrls) fd.append("urls", urls);

    setBusy(true);
    try {
      const res = await fetch("/api/corpus-builder/run", {
        method: "POST",
        body: fd,
        headers: getAIHeaders(),
      });
      const data = await readJsonResponse<RunResponse & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Run failed");
      setResult(data as RunResponse);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }, [files, urls, getAIHeaders]);

  const downloadHref = (name: string) =>
    result ? `/api/corpus-builder/download/${encodeURIComponent(result.runId)}/${encodeURIComponent(name)}` : "#";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Multi-agent</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Corpus builder</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Upload documents (PDF, Word, Excel, Markdown, text, CSV, JSON, images) or paste HTTPS URLs. Click{" "}
          <strong className="font-medium text-zinc-300">Run</strong>: agents extract text, then work in sequence —
          Source Analyst (per source), Corpus Synthesis (merged training document), Reference Index (structured JSON).
          Downloads appear below.{" "}
          <span className="text-zinc-500">
            Original files are removed from the server after extraction to save disk space; only the generated outputs
            are kept under <code className="text-zinc-400">.data/corpus-builder/outputs/</code>.
          </span>
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-lg">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Files</label>
          <input
            type="file"
            multiple
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
            onChange={(e) => setFiles(e.target.files)}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Up to 24 sources total (files + URLs). Large PDFs and sheets are truncated per source for model limits.
          </p>
        </div>

        <div>
          <label htmlFor="urls" className="block text-sm font-medium text-zinc-300">
            URLs (optional)
          </label>
          <textarea
            id="urls"
            rows={4}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={"https://example.com/page\nhttps://example.com/doc.pdf"}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRun()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Running agents…" : "Run"}
        </button>

        {err ? (
          <p className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{err}</p>
        ) : null}
      </section>

      {result ? (
        <section className="mt-10 space-y-6">
          <h2 className="text-lg font-semibold text-zinc-100">Results</h2>
          <p className="text-sm text-zinc-400">
            Run <code className="text-zinc-500">{result.runId}</code> ·{" "}
            {new Date(result.manifest.createdAt).toLocaleString()}
          </p>

          <div>
            <h3 className="text-sm font-medium text-zinc-300">Downloads</h3>
            <ul className="mt-2 space-y-2">
              {result.outputFiles.map((name) => (
                <li key={name}>
                  <a
                    href={downloadHref(name)}
                    download
                    className="text-sm text-teal-400 underline-offset-2 hover:text-teal-300 hover:underline"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-300">Sources</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
              {result.manifest.sources.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  <span className="text-zinc-300">{s.label}</span>{" "}
                  <span className="text-zinc-500">({s.kind})</span>
                  {s.hadError ? <span className="text-amber-400"> — extraction issue</span> : null}
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-xl border border-zinc-800 bg-zinc-900/30">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">
              Agent log ({result.agentLog.length} lines)
            </summary>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
              {result.agentLog.join("\n")}
            </pre>
          </details>
        </section>
      ) : null}
    </div>
  );
}
