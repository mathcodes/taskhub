"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { useVoicePageContext } from "@/components/VoiceAssistantProvider";
import { useOpenAIFetchHeaders, useUserOpenAIKey } from "@/components/UserOpenAIKeyProvider";
import {
  alignAndCompare,
  localFeedback,
  parseNoteList,
  type AnalysisReport,
  type NoteLabel,
} from "@/lib/pitchCoach/analysis";

const SAMPLE_URL = "/pitch-coach/sample-c-major-scale.wav";

const PRESETS = [
  { label: "C major scale", notes: "C4 D4 E4 F4 G4 A4 B4 C5" },
  { label: "E minor pentatonic", notes: "E4 G4 A4 B4 D5 E5" },
  { label: "A blues scale", notes: "A3 C4 D4 Eb4 E4 G4 A4" },
  { label: "Twinkle", notes: "C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4" },
];

const LABEL_TEXT: Record<NoteLabel, string> = {
  correct: "In tune",
  flat: "Flat",
  sharp: "Sharp",
  wrong_note: "Wrong note",
  extra: "Extra",
};

const LABEL_STYLES: Record<NoteLabel, string> = {
  correct: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  flat: "border-sky-500/50 bg-sky-500/10 text-sky-200",
  sharp: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  wrong_note: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  extra: "border-violet-500/50 bg-violet-500/10 text-violet-200",
};

type Source = { kind: "file" | "recording" | "sample"; name: string; data: ArrayBuffer };
type Result = AnalysisReport & { feedback_md: string; feedbackSource: "claude" | "local" };

function Feedback({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-200">
      {markdown.split("\n").map((line, index) => {
        const text = line.trim();
        if (!text) return null;
        if (text.startsWith("## ")) {
          return (
            <h3 key={index} className="pt-3 text-sm font-semibold uppercase tracking-wide text-emerald-300">
              {text.slice(3)}
            </h3>
          );
        }
        const plain = text.replaceAll("**", "");
        if (plain.startsWith("- ") || plain.startsWith("* ")) {
          return (
            <p key={index} className="pl-4 -indent-3">
              • {plain.slice(2)}
            </p>
          );
        }
        return <p key={index}>{plain}</p>;
      })}
    </div>
  );
}

export function PitchCoachClient() {
  const pathname = usePathname();
  const setVoicePageContext = useVoicePageContext();
  const getAIHeaders = useOpenAIFetchHeaders();
  const { anthropicKey, ready: keysReady } = useUserOpenAIKey();

  const [source, setSource] = useState<Source | null>(null);
  const [score, setScore] = useState(PRESETS[0].notes);
  const [playerNote, setPlayerNote] = useState("");
  const [tolerance, setTolerance] = useState(25);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setVoicePageContext({
      pathname: pathname || "/pitch-coach",
      viewLabel: "Pitch Coach",
      summary:
        "Record or upload a single-note melody, enter the expected notes, and get note-by-note pitch accuracy in cents with coaching feedback.",
    });
    return () => setVoicePageContext(null);
  }, [pathname, setVoicePageContext]);

  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const loadSample = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error("Couldn't load the sample recording.");
      setSource({ kind: "sample", name: "Sample: C major scale played with a few mistakes", data: await res.arrayBuffer() });
      setScore(PRESETS[0].notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the sample recording.");
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    setError(null);
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio. Upload a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        setSource({ kind: "recording", name: "Microphone recording", data: await blob.arrayBuffer() });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser, or upload a recording instead.");
    }
  }, [recording]);

  const analyze = useCallback(async () => {
    setError(null);
    setResult(null);
    if (!source) {
      setError("Choose a recording first: upload a file, record one, or use the sample.");
      return;
    }
    let expected: number[];
    try {
      expected = parseNoteList(score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the expected notes.");
      return;
    }

    setBusy(true);
    try {
      setStatus("Decoding audio…");
      const { decodeToMono22k, detectNotes } = await import("@/lib/pitchCoach/detect");
      const samples = await decodeToMono22k(source.data);
      if (samples.length < 22050 * 0.3) throw new Error("That recording is too short to analyze.");

      setStatus("Loading pitch model…");
      const detected = await detectNotes(samples, (p) => setStatus(`Detecting notes… ${Math.round(p * 100)}%`));
      if (!detected.length) {
        throw new Error("No notes were detected. Try a louder, single-note recording with less background noise.");
      }
      const report = alignAndCompare(detected, expected, tolerance);

      let feedback_md = localFeedback(report.stats);
      let feedbackSource: Result["feedbackSource"] = "local";
      if (anthropicKey) {
        setStatus("Asking Claude for coaching feedback…");
        const res = await fetch("/api/pitch-coach/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAIHeaders() },
          body: JSON.stringify({ report, context: playerNote.trim() }),
        });
        const data = await readJsonResponse<{ feedback_md?: string; error?: string }>(res);
        if (res.ok && data.feedback_md) {
          feedback_md = data.feedback_md;
          feedbackSource = "claude";
        } else {
          setError(`${data.error || "Claude feedback failed"} Showing built-in feedback instead.`);
        }
      }
      setResult({ ...report, feedback_md, feedbackSource });
      setStatus("Analysis complete.");
      requestAnimationFrame(() => resultsRef.current?.focus());
    } catch (e) {
      setStatus("");
      setError(
        e instanceof Error && e.message
          ? e.message.includes("decode")
            ? "This audio format couldn't be decoded. Try WAV, MP3, or M4A."
            : e.message
          : "Pitch analysis failed."
      );
    } finally {
      setBusy(false);
    }
  }, [anthropicKey, getAIHeaders, playerNote, score, source, tolerance]);

  const sourceButton =
    "min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Music analysis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Pitch Coach</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
          Play or sing a single-note melody and compare it with the notes you meant to hit. Spotify&apos;s Basic Pitch
          model finds each note in your browser, a YIN pitch tracker measures intonation in cents, and the notes are
          aligned to your score. Your audio never leaves this device.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section aria-labelledby="pc-input-heading" className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg sm:p-6">
          <h2 id="pc-input-heading" className="sr-only">
            Recording and score
          </h2>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-200">1. Recording</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className={`${sourceButton} cursor-pointer border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus-within:outline focus-within:outline-2 focus-within:outline-emerald-400`}>
                Upload file
                <input
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aiff"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 25 * 1024 * 1024) {
                      setError("That file is over 25 MB. Trim it to the passage you want analyzed.");
                      return;
                    }
                    setError(null);
                    setSource({ kind: "file", name: file.name, data: await file.arrayBuffer() });
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => void toggleRecording()}
                aria-pressed={recording}
                className={`${sourceButton} ${
                  recording ? "border-rose-400 bg-rose-900/60 text-rose-50" : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
              >
                {recording ? "Stop recording" : "Record"}
              </button>
              <button
                type="button"
                onClick={() => void loadSample()}
                className={`${sourceButton} border-emerald-700 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-900/60`}
              >
                Use sample
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-300" aria-live="polite">
              {recording ? "Recording… play your melody, then press Stop recording." : source ? `Selected: ${source.name}` : "No recording selected."}
            </p>
          </fieldset>

          <div>
            <label htmlFor="pitch-score" className="block text-sm font-medium text-zinc-200">
              2. Expected notes
            </label>
            <p id="pitch-score-hint" className="mt-0.5 text-xs text-zinc-400">
              Note names with octaves, separated by spaces (C4 = middle C).
            </p>
            <textarea
              id="pitch-score"
              rows={3}
              value={score}
              aria-describedby="pitch-score-hint"
              onChange={(event) => setScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Preset scores">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setScore(preset.notes)}
                  className="min-h-8 rounded-lg border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-600 hover:text-emerald-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pitch-tolerance" className="block text-sm font-medium text-zinc-200">
              3. Tolerance: <span className="tabular-nums">±{tolerance}¢</span>
            </label>
            <input
              id="pitch-tolerance"
              type="range"
              min={10}
              max={100}
              step={5}
              value={tolerance}
              aria-valuetext={`plus or minus ${tolerance} cents`}
              onChange={(event) => setTolerance(Number(event.target.value))}
              className="mt-3 w-full accent-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="pitch-player-note" className="block text-sm font-medium text-zinc-200">
              Practice context <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="pitch-player-note"
              type="text"
              value={playerNote}
              onChange={(event) => setPlayerNote(event.target.value)}
              placeholder="e.g. working on bends"
              className="mt-2 w-full rounded-xl border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={busy || recording}
            onClick={() => void analyze()}
            className="min-h-11 w-full rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Analyzing…" : "Analyze performance"}
          </button>

          <p role="status" className="min-h-5 text-sm text-zinc-300">
            {status}
          </p>
          {error ? (
            <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          {keysReady && !anthropicKey ? (
            <p className="text-xs leading-relaxed text-zinc-400">
              Feedback is generated locally. Add an Anthropic key with <strong className="text-zinc-200">Add API keys</strong>{" "}
              (top of the page) for coaching written by Claude.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="pc-results-heading">
          <h2 id="pc-results-heading" ref={resultsRef} tabIndex={-1} className="sr-only">
            Results
          </h2>
          {!result ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 px-6 text-center">
              <div>
                <p className="text-lg font-medium text-zinc-200">Your analysis will appear here</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                  New here? Press <strong className="text-zinc-200">Use sample</strong>, then{" "}
                  <strong className="text-zinc-200">Analyze performance</strong>. The first run downloads a small pitch
                  model (about 1 MB).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Accuracy", `${result.stats.accuracy_pct}%`, "text-emerald-300"],
                  ["Correct", result.stats.correct, "text-emerald-300"],
                  ["Off target", result.stats.wrong_note, "text-rose-300"],
                  ["Missed", result.stats.missed, "text-amber-300"],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <dt className="order-2 mt-1 text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
                    <dd className={`order-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-zinc-100">Note by note</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  {result.stats.total_played} played · {result.stats.total_expected} expected · average tuning error{" "}
                  {result.stats.avg_cents_off}¢ · extra notes {result.stats.extra}
                </p>
                <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                  {result.note_results.map((note, index) => (
                    <li
                      key={`${note.onset_sec}-${index}`}
                      className={`min-w-0 rounded-lg border p-2 text-center ${LABEL_STYLES[note.label]}`}
                    >
                      <p className="truncate text-base font-semibold">{note.played}</p>
                      <p className="truncate text-xs">{note.expected ? `expected ${note.expected}` : "not in score"}</p>
                      <p className="mt-1 text-xs font-medium">
                        {LABEL_TEXT[note.label]}
                        {note.cents_off !== null && note.label !== "wrong_note"
                          ? ` ${note.cents_off > 0 ? "+" : ""}${Math.round(note.cents_off)}¢`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ol>
                {result.stats.missed_notes.length ? (
                  <p className="mt-4 text-sm text-amber-200">Missed: {result.stats.missed_notes.join(", ")}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Coaching feedback{" "}
                  <span className="text-xs font-normal text-zinc-400">
                    ({result.feedbackSource === "claude" ? "by Claude" : "built-in"})
                  </span>
                </h3>
                <div className="mt-2">
                  <Feedback markdown={result.feedback_md} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
