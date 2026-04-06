import Link from "next/link";

export default function CorpusBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-200">
            ← All features
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
