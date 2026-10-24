import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";
import type { ExtractedSource } from "@/lib/corpusBuilder/extract";

const SOURCE_ANALYST_SYSTEM = `You are the Source Analyst agent in a multi-agent training-prep pipeline.
Given raw text (or an error) from one document, URL, or image transcription, produce a concise Markdown "source card" for downstream agents.

Rules:
- Use a clear ## title line with the source label.
- Summarize factual content in bullets; preserve important names, numbers, dates, and domain terms.
- If the input was an error or empty, explain what is missing in 2–3 bullets and suggest what the user could upload instead.
- Do not invent facts not supported by the input.
- Keep under ~1,200 words.`;

const CORPUS_SYNTH_SYSTEM = `You are the Corpus Synthesis agent. You receive multiple Markdown "source cards" from other agents.
Merge them into ONE training-ready document:

- Use a single # title and optional ## sections by theme (not necessarily by original file).
- De-duplicate overlapping facts; note conflicts briefly if two sources disagree.
- Prefer dense, skimmable prose and bullet lists where helpful for LLM fine-tuning or RAG.
- End with a short "### Gaps and follow-ups" section listing missing info.
- Do not include raw binary or claims you cannot ground in the cards.
- Maximum length ~12,000 words; summarize if needed.`;

const REFERENCE_INDEX_SYSTEM = `You are the Reference Index agent. Given the final training corpus text, emit a JSON object ONLY (no markdown fences) with:
{
  "title": string (short name for this knowledge pack),
  "summary": string (2–4 sentences),
  "topics": string[] (5–20 short topic tags),
  "entities": { "name": string, "role": string }[] (key people/products/places mentioned; empty array if none),
  "suggested_chunks": { "title": string, "content_outline": string }[] (8–24 suggested retrieval chunks for vector/RAG),
  "training_notes": string[] (bullet tips for humans curating this dataset)
}
Use only information present in the corpus. Return valid JSON.`;

export async function agentSourceCard(
  apiKey: string,
  src: ExtractedSource
): Promise<string> {
  const body = [
    `Source: ${src.label}`,
    `Kind: ${src.kind}`,
    src.error ? `Extraction note: ${src.error}` : "",
    "",
    "---",
    "",
    src.text?.trim() || "(no text extracted)",
  ]
    .filter(Boolean)
    .join("\n");

  return chatCompletion(SOURCE_ANALYST_SYSTEM, body, {
    apiKey,
    maxTokens: 2800,
    temperature: 0.25,
  });
}

function shrinkForMerge(cards: string[], maxChars: number): string {
  const joined = cards.join("\n\n---\n\n");
  if (joined.length <= maxChars) return joined;
  const ratio = maxChars / joined.length;
  return cards
    .map((c) => c.slice(0, Math.max(500, Math.floor(c.length * ratio * 0.98))))
    .join("\n\n---\n\n");
}

export async function agentMergeCorpus(apiKey: string, sourceCards: string[]): Promise<string> {
  const mergedInput = shrinkForMerge(sourceCards, 95_000);
  return chatCompletion(CORPUS_SYNTH_SYSTEM, mergedInput, {
    apiKey,
    maxTokens: 14_000,
    temperature: 0.35,
  });
}

export async function agentReferenceIndex(apiKey: string, corpus: string): Promise<string> {
  const trimmed = corpus.length > 60_000 ? `${corpus.slice(0, 60_000)}\n\n[TRUNCATED]` : corpus;
  const text = await chatCompletion(REFERENCE_INDEX_SYSTEM, trimmed, {
    apiKey,
    maxTokens: 4096,
    temperature: 0.2,
    jsonMode: true,
  });
  const cleaned = stripJsonFence(text);
  JSON.parse(cleaned); // validate
  return cleaned;
}
