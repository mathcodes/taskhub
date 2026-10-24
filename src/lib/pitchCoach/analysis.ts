/**
 * Pitch Coach analysis: score parsing, note alignment, and summary stats.
 * Pure functions shared by the browser (detection) and the feedback API route.
 */

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  CB: "B",
  DB: "C#",
  EB: "D#",
  FB: "E",
  GB: "F#",
  AB: "G#",
  BB: "A#",
};

/** Deviations beyond this many cents are treated as a different note, not a tuning issue. */
export const INTONATION_LIMIT_CENTS = 70;

export type NoteLabel = "correct" | "flat" | "sharp" | "wrong_note" | "extra";

/** A note detected in the recording. `midi` is fractional (e.g. 60.12 = C4, 12 cents sharp). */
export type DetectedNote = {
  onsetSec: number;
  durationSec: number;
  midi: number;
  amplitude: number;
};

export type NoteResult = {
  played: string;
  expected: string | null;
  cents_off: number | null;
  label: NoteLabel;
  onset_sec: number;
};

export type AnalysisStats = {
  accuracy_pct: number;
  total_played: number;
  total_expected: number;
  correct: number;
  wrong_note: number;
  missed: number;
  extra: number;
  avg_cents_off: number;
  missed_notes: string[];
};

export type AnalysisReport = { stats: AnalysisStats; note_results: NoteResult[] };

export function midiToNote(midi: number): string {
  const n = Math.round(midi);
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

/** Parse "C4", "Eb3", "f#5", "Bb-1" into a MIDI number, or null if invalid. */
export function noteToMidi(token: string): number | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(token.trim());
  if (!m) return null;
  let name = m[1].toUpperCase() + (m[2] === "#" ? "#" : m[2] === "b" ? "B" : "");
  name = FLAT_TO_SHARP[name] ?? name;
  const idx = (NOTE_NAMES as readonly string[]).indexOf(name);
  if (idx < 0) return null;
  const octave = Number(m[3]);
  // Cb belongs to the octave below its letter name
  const octaveShift = m[1].toUpperCase() === "C" && m[2] === "b" ? -1 : 0;
  return (octave + 1 + octaveShift) * 12 + idx;
}

/** Parse a whitespace/comma separated note list. Throws with a helpful message on bad tokens. */
export function parseNoteList(input: string): number[] {
  const tokens = input.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new Error("Enter at least one expected note, for example C4 D4 E4.");
  const bad: string[] = [];
  const notes: number[] = [];
  for (const t of tokens) {
    const midi = noteToMidi(t);
    if (midi === null) bad.push(t);
    else notes.push(midi);
  }
  if (bad.length) {
    throw new Error(
      `Couldn't read ${bad.slice(0, 3).map((b) => `"${b}"`).join(", ")}. Use note names with octaves, like C4, F#3, or Bb4.`
    );
  }
  return notes;
}

/**
 * Greedy sequential alignment with a short lookahead: a played note that matches a
 * note a few steps ahead marks the skipped expected notes as missed.
 */
export function alignAndCompare(
  played: DetectedNote[],
  expected: number[],
  centsThreshold = 50
): AnalysisReport {
  const results: NoteResult[] = [];
  const missed: number[] = [];
  let i = 0;

  for (let p = 0; p < played.length; p++) {
    const note = played[p];
    if (i >= expected.length) {
      results.push({ played: midiToNote(note.midi), expected: null, cents_off: null, label: "extra", onset_sec: round(note.onsetSec, 3) });
      continue;
    }
    let target = expected[i];
    let diff = (note.midi - target) * 100;
    let label: NoteLabel;

    if (Math.abs(diff) <= centsThreshold) {
      label = "correct";
      i += 1;
    } else {
      let ahead: number | null = null;
      for (let k = 1; k < Math.min(4, expected.length - i); k++) {
        if (Math.abs((note.midi - expected[i + k]) * 100) <= centsThreshold) {
          ahead = k;
          break;
        }
      }
      const next = played[p + 1];
      const nextMatchesCurrent = next !== undefined && Math.abs((next.midi - expected[i]) * 100) <= centsThreshold;
      if (ahead === null && nextMatchesCurrent) {
        // A stray note before the right one: count it as extra without consuming the score
        results.push({ played: midiToNote(note.midi), expected: null, cents_off: null, label: "extra", onset_sec: round(note.onsetSec, 3) });
        continue;
      }
      if (ahead !== null) {
        missed.push(...expected.slice(i, i + ahead));
        i += ahead;
        target = expected[i];
        diff = (note.midi - target) * 100;
        label = "correct";
        i += 1;
      } else {
        // Within ~a third of a semitone it's an intonation problem; beyond that it's the wrong note
        label = Math.abs(diff) < INTONATION_LIMIT_CENTS ? (diff < 0 ? "flat" : "sharp") : "wrong_note";
        i += 1;
      }
    }
    results.push({
      played: midiToNote(note.midi),
      expected: midiToNote(target),
      cents_off: round(diff, 1),
      label,
      onset_sec: round(note.onsetSec, 3),
    });
  }
  missed.push(...expected.slice(i));

  const correct = results.filter((r) => r.label === "correct").length;
  const extra = results.filter((r) => r.label === "extra").length;
  const wrong = results.length - correct - extra;
  const cents = results.filter((r) => r.cents_off !== null && r.label !== "wrong_note").map((r) => Math.abs(r.cents_off as number));

  return {
    stats: {
      accuracy_pct: round((100 * correct) / Math.max(expected.length, 1), 1),
      total_played: results.length,
      total_expected: expected.length,
      correct,
      wrong_note: wrong,
      missed: missed.length,
      extra,
      avg_cents_off: cents.length ? round(cents.reduce((a, b) => a + b, 0) / cents.length, 1) : 0,
      missed_notes: missed.map(midiToNote),
    },
    note_results: results,
  };
}

/** Deterministic coaching text used when no Anthropic key is available. */
export function localFeedback(stats: AnalysisStats): string {
  const focus: string[] = [];
  if (stats.wrong_note) focus.push(`- Slow down and review the ${stats.wrong_note} note(s) that were off target.`);
  if (stats.missed) focus.push(`- Practice the missed notes: ${stats.missed_notes.join(", ")}.`);
  if (stats.extra) focus.push(`- Cut the ${stats.extra} extra note(s) by leaving a clear gap between notes.`);
  if (stats.avg_cents_off > 20) focus.push(`- Average tuning error is ${stats.avg_cents_off}¢; sustain each note against a drone to center the pitch.`);
  if (!focus.length) focus.push("- Keep the same pitch control and raise the tempo gradually.");
  return [
    "## Overall",
    `Accuracy **${stats.accuracy_pct}%** with an average pitch error of **${stats.avg_cents_off}¢**.`,
    "## What's working",
    `${stats.correct} of ${stats.total_expected} expected notes matched within tolerance.`,
    "## Focus areas",
    ...focus,
  ].join("\n");
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
