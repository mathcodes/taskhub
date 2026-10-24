import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/taskhub", label: "Tasks" },
  { href: "/sql-query", label: "SQL Query" },
  { href: "/pitch-coach", label: "Pitch Coach" },
];

export function SiteFooter() {
  return (
    <footer className="sticky bottom-0 z-30 border-t border-zinc-800/90 bg-zinc-950/90 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-200">TaskHub</p>
          <p className="text-xs text-zinc-400">Focused tools for practical work.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Footer navigation">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs text-zinc-400 transition hover:text-zinc-200">
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/mathcodes/taskhub"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}