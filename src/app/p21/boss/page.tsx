import Link from "next/link";
import { BossRulePanel } from "@/components/p21/BossRulePanel";
import { P21VoiceContext } from "@/components/p21/P21VoiceContext";

export const metadata = {
  title: "P21 · BOSS Business Rule agent",
  description:
    "Multi-agent pipeline: examples, SQL sketches, docs grounding, then full C# from DCNA_BR_TEMPLATE_v1.",
};

export default function P21BossPage() {
  return (
    <P21VoiceContext>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          P21 · Business rules
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
          BOSS — Business Rule agent
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Describe a rule in plain English. Agents run:{" "}
          <strong className="font-medium text-zinc-300">examples</strong>,{" "}
          <strong className="font-medium text-zinc-300">SQL</strong>,{" "}
          <strong className="font-medium text-zinc-300">docs</strong>, then{" "}
          <strong className="font-medium text-zinc-300">synthesis</strong> — a complete C# business rule
          starting from{" "}
          <code className="font-mono text-xs text-zinc-500">DCNA_BR_TEMPLATE_v1.txt</code>. Add training
          under{" "}
          <code className="font-mono text-xs text-zinc-500">docs/p21/training/boss/</code>.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          <Link href="/p21" className="text-violet-400 hover:text-violet-300">
            ← SQL Query Master
          </Link>
        </p>

        <div className="mt-10">
          <BossRulePanel />
        </div>

        <section className="mt-14 border-t border-zinc-800 pt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Training corpus
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            See{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
              docs/p21/training/boss/README.md
            </code>{" "}
            for folder layout: <code className="font-mono text-xs">boss/docs/**/*.md</code>,{" "}
            <code className="font-mono text-xs">boss/examples/rules.examples.json</code>.
          </p>
        </section>
      </div>
    </P21VoiceContext>
  );
}
