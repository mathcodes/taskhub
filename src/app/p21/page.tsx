import { P21QueryPanel } from "@/components/p21/P21QueryPanel";
import { P21VoiceContext } from "@/components/p21/P21VoiceContext";

export const metadata = {
  title: "P21 SQL Query Master",
  description:
    "Natural language to SQL, reports, and visuals — agents for data questions.",
};

export default function P21Page() {
  return (
    <P21VoiceContext>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          P21 · SQL Server
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
          SQL Query Master
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Ask in plain English. We retrieve relevant P21 tables/columns from the bundled dictionary
          (<code className="font-mono text-xs text-zinc-500">docs/p21/training/sql_p21_db.csv</code>
          ), then run two agents: <strong className="font-medium text-zinc-300">NL→SQL</strong>{" "}
          (generate T-SQL) and <strong className="font-medium text-zinc-300">review</strong>{" "}
          (read-only / safety check). SQL is <strong className="font-medium text-zinc-300">not</strong>{" "}
          executed here—copy to SSMS or your approved tool.
        </p>

        <p className="mt-6 text-sm text-zinc-500">
          <a
            href="/p21/boss"
            className="font-medium text-fuchsia-400/90 hover:text-fuchsia-300"
          >
            BOSS — Business Rule agent
          </a>{" "}
          — multi-agent rule specs from prompts (training in{" "}
          <code className="font-mono text-xs text-zinc-600">docs/p21/training/boss/</code>).
        </p>

        <div className="mt-10">
          <P21QueryPanel />
        </div>

        <section className="mt-14 border-t border-zinc-800 pt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Docs &amp; training (repository)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Training notes and extra examples live under{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
              docs/p21/
            </code>
          . The CSV is a <strong className="text-zinc-300">schema dictionary</strong> (table,
          column, description)—not execution logs. Add curated NL→SQL pairs in{" "}
          <code className="font-mono text-xs text-zinc-500">docs/p21/training/nl_sql_examples.json</code>{" "}
          (see <code className="font-mono text-xs text-zinc-500">training/README.md</code>) for
          higher quality.
          </p>
        </section>
      </div>
    </P21VoiceContext>
  );
}
