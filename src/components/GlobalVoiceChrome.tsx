"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoiceChromePanel, VoiceChromeToolbar } from "@/components/VoiceAssistantProvider";

const NAV_ITEMS = [
  { href: "/taskhub", label: "Tasks" },
  { href: "/sql-query", label: "SQL Query" },
  { href: "/pitch-coach", label: "Pitch Coach" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/corpus-builder", label: "Corpus Builder" },
];

export function GlobalVoiceChrome() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950/90 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="TaskHub home">
          <span className="grid size-8 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-mono text-sm font-bold text-cyan-300 transition group-hover:border-cyan-300/60 group-hover:bg-cyan-400/15">
            TH
          </span>
          <span className="hidden text-sm font-semibold tracking-wide text-zinc-100 sm:block">TaskHub</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white">
              Tools
            </summary>
            <nav className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
          <VoiceChromeToolbar />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <VoiceChromePanel />
      </div>
    </header>
  );
}
