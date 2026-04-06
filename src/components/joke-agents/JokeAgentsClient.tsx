"use client";

import Link from "next/link";
import { useState } from "react";
import { flushSync } from "react-dom";
import { useOpenAIFetchHeaders } from "@/components/UserOpenAIKeyProvider";
import { readJsonResponse } from "@/lib/readJsonResponse";

type JokeLine = {
  id: string;
  title: string;
  phrases: string[];
  text: string;
};

function runSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function JokeAgentsClient() {
  const getAIHeaders = useOpenAIFetchHeaders();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [jokes, setJokes] = useState<JokeLine[] | null>(null);
  /** Which joke is currently highlighted (0–2); -1 = none / reset */
  const [active, setActive] = useState(-1);
  const [speaking, setSpeaking] = useState(false);

  async function submit() {
    const phrase1 = p1.trim();
    const phrase2 = p2.trim();
    const phrase3 = p3.trim();
    if (!phrase1 || !phrase2 || !phrase3) return;
    setBusy(true);
    setErr(null);
    setJokes(null);
    setActive(-1);
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    try {
      const res = await fetch("/api/joke-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAIHeaders(),
        },
        body: JSON.stringify({ phrase1, phrase2, phrase3 }),
      });
      const data = await readJsonResponse<{ error?: string; jokes?: JokeLine[] }>(res);
      if (!res.ok) throw new Error(data.error || "Failed");
      const list = data.jokes;
      if (!Array.isArray(list) || list.length !== 3) throw new Error("Invalid response");
      setJokes(list);

      for (let i = 0; i < 3; i++) {
        const line = list[i]!;
        flushSync(() => {
          setActive(i);
          setSpeaking(true);
        });
        await runSpeech(`${line.title} says… ${line.text}`);
        flushSync(() => setSpeaking(false));
        if (i < 2) await delay(700);
      }
      flushSync(() => setActive(3));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
      setSpeaking(false);
    }
  }

  function stopSpeech() {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Fun</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Three joke agents</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Enter <strong className="font-medium text-zinc-300">three</strong> words or phrases below.{" "}
        <strong className="font-medium text-zinc-300">Every</strong> agent sees all three and must build a
        joke that uses all of them—a{" "}
        <strong className="font-medium text-zinc-300">70-year-old traditionalist</strong>, a{" "}
        <strong className="font-medium text-zinc-300">clown</strong>, and the{" "}
        <strong className="font-medium text-zinc-300">funniest person on earth</strong> each take their own
        swing. They go <strong className="font-medium text-zinc-300">one at a time</strong>; each joke appears
        and is read aloud when it’s ready (if your browser supports speech).
      </p>
      <p className="mt-2 text-sm">
        <Link href="/" className="text-teal-400 hover:text-teal-300">
          ← Home
        </Link>
      </p>

      <div className="mt-10 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
        <label className="block">
          <span className="text-xs font-medium uppercase text-zinc-500">Entry 1</span>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="e.g. buttered biscuit"
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase text-zinc-500">Entry 2</span>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            placeholder="e.g. rubber chicken"
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase text-zinc-500">Phrase 3 — funniest on earth</span>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            value={p3}
            onChange={(e) => setP3(e.target.value)}
            placeholder="e.g. tax return"
            disabled={busy}
          />
        </label>
        <button
          type="button"
          disabled={busy || !p1.trim() || !p2.trim() || !p3.trim()}
          onClick={() => void submit()}
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-3 text-sm font-medium text-white hover:from-fuchsia-500 hover:to-orange-400 disabled:opacity-40"
        >
          {busy ? "Summoning the comedians…" : "Let them joke!"}
        </button>
        {speaking && (
          <button
            type="button"
            onClick={stopSpeech}
            className="w-full rounded-lg border border-zinc-600 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Stop speech
          </button>
        )}
      </div>

      {err && (
        <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {err}
        </div>
      )}

      {jokes && (
        <div className="mt-10 space-y-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Showtime</h2>
          {jokes.map((j, i) => {
            const isLive = active === i;
            const showText = active >= i;
            return (
              <article
                key={j.id}
                className={`rounded-2xl border p-5 transition ${
                  isLive
                    ? "border-fuchsia-500/50 bg-fuchsia-950/25 shadow-lg ring-1 ring-fuchsia-500/30"
                    : showText
                      ? "border-zinc-700/80 bg-zinc-900/40"
                      : "border-zinc-800/50 bg-zinc-950/40 opacity-55"
                }`}
              >
                <p className="text-xs font-medium uppercase text-fuchsia-400/90">{j.title}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  All three prompts:{" "}
                  <span className="font-mono text-zinc-400">
                    {(j.phrases ?? []).map((ph) => `"${ph}"`).join(" · ")}
                  </span>
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-100">
                  {showText ? j.text : "…waiting for their turn…"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
