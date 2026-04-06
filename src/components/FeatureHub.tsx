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
      "Weekly recurring tasks, completion logs with optional ratings, voice assistant with page context, and agents for monitor alerts and daily summaries. Includes Multi-Agent Assessment (Claude) from the Task Hub page. Bring your own OpenAI key or use server config.",
    accent: "from-teal-500/20 to-emerald-600/10 border-teal-500/30 hover:border-teal-400/50",
  },
  {
    href: "/taskhub/multi-agent-assessment",
    title: "Multi-Agent Assessment",
    tagline: "Claude · concierge → committee",
    description:
      "Demo form validated by multiple Claude agents in sequence—investigator, administrator, and a grading committee—with logs and a downloadable transcript. Uses ANTHROPIC_API_KEY on the server.",
    accent: "from-indigo-500/20 to-violet-600/10 border-indigo-500/30 hover:border-indigo-400/50",
  },
  {
    href: "/joke-agents",
    title: "Three joke agents",
    tagline: "Three phrases → three roasts",
    description:
      "Enter three words or phrases; each comedian must use all three in one joke—traditionalist, clown, and funniest-on-earth take turns. Optional speech. Uses your OpenAI key (BYOK) or the server’s.",
    accent: "from-fuchsia-500/20 to-orange-600/10 border-fuchsia-500/30 hover:border-orange-400/40",
  },
  {
    href: "/p21",
    title: "P21 SQL Query Master",
    tagline: "Natural language → SQL → reports",
    description:
      "Agents that turn plain-English requests into SQL, run them safely against your data, and return reports with charts using the best-fit visualization. (In development.)",
    accent: "from-violet-500/20 to-fuchsia-600/10 border-violet-500/30 hover:border-violet-400/50",
  },
  {
    href: "/p21/boss",
    title: "BOSS · Business Rule agent",
    tagline: "Prompt → implementation spec",
    description:
      "Multi-agent pipeline over curated rule examples and P21 training docs: NL understanding, doc-grounded T-SQL sketches, and synthesis into a spec you can implement in P21. Nothing is written to P21 automatically.",
    accent: "from-rose-500/20 to-pink-600/10 border-rose-500/30 hover:border-rose-400/50",
  },
  {
    href: "/playbooks",
    title: "Department playbooks",
    tagline: "SOPs → guided runs for the floor",
    description:
      "Supervisors upload JSON checklists; an agent expands each step into a walkthrough. Assign workers by email or SMS—they get a private link to complete steps and log notes. Built for warehouse, DC, and counter workflows.",
    accent: "from-amber-500/20 to-orange-600/10 border-amber-500/30 hover:border-amber-400/50",
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
        "Landing page with Task Hub, Multi-Agent Assessment, joke agents, P21 SQL, BOSS, and playbooks. Say e.g. open joke agents, task hub, P21, BOSS, or playbooks.",
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

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
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
