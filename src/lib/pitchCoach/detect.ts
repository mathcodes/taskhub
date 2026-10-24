"use client";

import type { DetectedNote } from "./analysis";

/**
 * In-browser note detection:
 *  1. Decode the recording and resample to 22.05 kHz mono (Basic Pitch's input rate).
 *  2. Spotify's Basic Pitch (TensorFlow.js) segments the audio into note events.
 *  3. Each note's pitch is refined with YIN on the note's sustain so intonation
 *     is measured in cents, not just rounded to the nearest semitone.
 * Nothing is uploaded: the audio never leaves the browser.
 */

const SAMPLE_RATE = 22050;
const MODEL_URL = "/basic-pitch/model.json";

export async function decodeToMono22k(data: ArrayBuffer): Promise<Float32Array> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(data.slice(0));
    const length = Math.ceil(decoded.duration * SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, Math.max(length, 1), SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}

/** YIN fundamental-frequency estimate (Hz) for a mono frame, or null if unvoiced. */
export function yinPitch(frame: Float32Array, sampleRate: number, threshold = 0.12): number | null {
  const half = Math.floor(frame.length / 2);
  const minLag = Math.floor(sampleRate / 1500);
  const maxLag = Math.min(half - 1, Math.floor(sampleRate / 55));
  if (maxLag <= minLag + 2) return null;
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const delta = frame[i] - frame[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  // cumulative mean normalized difference
  let running = 0;
  d[0] = 1;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    d[tau] = running ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= maxLag && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // parabolic interpolation for sub-sample accuracy
  const x0 = tau > 1 ? d[tau - 1] : d[tau];
  const x2 = tau < maxLag ? d[tau + 1] : d[tau];
  const denom = 2 * d[tau] - x2 - x0;
  const better = denom ? tau + (x2 - x0) / (2 * denom) : tau;
  return sampleRate / better;
}

const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/** Median of YIN estimates across the steady middle of a note. */
function refinePitch(samples: Float32Array, onsetSec: number, durationSec: number, coarseMidi: number): number {
  const frameLen = 2048;
  const start = Math.floor((onsetSec + Math.min(0.06, durationSec * 0.25)) * SAMPLE_RATE);
  const end = Math.floor((onsetSec + durationSec * 0.85) * SAMPLE_RATE);
  const estimates: number[] = [];
  for (let pos = start; pos + frameLen <= Math.min(end, samples.length); pos += 512) {
    const hz = yinPitch(samples.subarray(pos, pos + frameLen), SAMPLE_RATE);
    if (hz) {
      const m = hzToMidi(hz);
      // Accept octave-consistent estimates only; YIN can lock onto a harmonic
      if (Math.abs(m - coarseMidi) <= 0.75) estimates.push(m);
    }
  }
  if (!estimates.length) return coarseMidi;
  estimates.sort((a, b) => a - b);
  return estimates[Math.floor(estimates.length / 2)];
}

export async function detectNotes(
  samples: Float32Array,
  onProgress: (fraction: number) => void
): Promise<DetectedNote[]> {
  const { BasicPitch, outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } = await import(
    "@spotify/basic-pitch"
  );
  const basicPitch = new BasicPitch(MODEL_URL);
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  await basicPitch.evaluateModel(
    samples,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => onProgress(Math.min(1, p))
  );
  // Monophonic-leaning settings: modest thresholds, ~58 ms minimum note length
  const events = noteFramesToTime(
    addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.4, 0.3, 5, true, 2000, 50, true))
  );
  const notes = events
    .filter((e) => e.durationSeconds >= 0.06)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

  // Monophonic reduction: when notes overlap in time (overtones, attack transients,
  // ringing strings), keep the stronger one so each melody note maps to one event.
  const mono: typeof notes = [];
  for (const n of notes) {
    const prev = mono[mono.length - 1];
    const prevEnd = prev ? prev.startTimeSeconds + prev.durationSeconds : -1;
    const overlap = prev ? prevEnd - n.startTimeSeconds : -1;
    if (prev && overlap > Math.min(0.08, 0.5 * Math.min(prev.durationSeconds, n.durationSeconds))) {
      if (n.amplitude > prev.amplitude) mono[mono.length - 1] = n;
    } else {
      mono.push(n);
    }
  }

  // Drop faint detections (room noise, sympathetic strings)
  const amps = mono.map((n) => n.amplitude).sort((a, b) => a - b);
  const median = amps[Math.floor(amps.length / 2)] ?? 0;
  const kept = mono.filter((n) => n.amplitude >= median * 0.35);

  return kept.map((n) => ({
    onsetSec: n.startTimeSeconds,
    durationSec: n.durationSeconds,
    midi: refinePitch(samples, n.startTimeSeconds, n.durationSeconds, n.pitchMidi),
    amplitude: n.amplitude,
  }));
}
