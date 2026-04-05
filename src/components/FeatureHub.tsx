"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";

type Feature = {
  href: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
};

const FEATURES: Feature[] = [
  {
    href: "/taskhub",
    title: "The Task Hub",
    tagline: "Schedules, logs & AI briefings",
    description:
      "Weekly recurring tasks, completion logs with optional ratings, voice assistant with page context, and agents for monitor alerts and daily summaries. Bring your own OpenAI key or use server config.",
    accent: "from-teal-500/20 to-emerald-600/10 border-teal-500/30 hover:border-teal-400/50",
  },
  {
    href: "/p21",
    title: "P21 SQL Query Master",
    tagline: "Natural language → SQL → reports",
    description:
      "Agents that turn plain-English requests into SQL, run them safely against your data, and return reports with charts using the best-fit visualization. (In development.)",
    accent: "from-violet-500/20 to-fuchsia-600/10 border-violet-500/30 hover:border-violet-400/50",
  },
];

export function FeatureHub() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/",
      viewLabel: "Home · Choose a feature",
      summary:
        "Landing page with links to Task Hub (weekly tasks, logs, voice assistant) and P21 SQL Query Master (natural language to T-SQL). User can say e.g. open task hub or go to P21 to navigate.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="mb-10 sm:mb-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Agent workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Choose a feature
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Each card opens a self-contained tool. More features will appear here over time.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        {FEATURES.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              className={`group block h-full rounded-2xl border bg-gradient-to-br p-6 shadow-lg transition sm:p-8 ${f.accent}`}
            >
              <h2 className="text-xl font-semibold text-zinc-50 group-hover:text-white sm:text-2xl">
                {f.title}
                <span className="ml-1 text-zinc-500 transition group-hover:text-zinc-400" aria-hidden>
                  →
                </span>
              </h2>
              <p className="mt-1 text-sm font-medium text-zinc-400">{f.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                {f.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
