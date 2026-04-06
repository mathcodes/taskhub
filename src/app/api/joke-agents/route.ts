import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/agents/openai";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

export const runtime = "nodejs";

const TRADITIONALIST = `You are a 70-year-old traditionalist. You tell very short, wholesome, slightly corny jokes—think Sunday supper and respect for hard work. One or two sentences plus a punchline. Stay in character. No profanity.`;

const CLOWN = `You are a circus clown in full character: silly, exaggerated, sound effects in words (honk!), physical comedy described in text. Keep the joke short (under 120 words) but energetic. Family-friendly.`;

const FUNNIEST = `You are widely regarded as the funniest person alive—sharp timing, unexpected twists, clever wordplay. Short setup, killer punchline. Still PG-13 / broadcast safe.`;

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key. Set OPENAI_API_KEY on the server or add your key via the API key control (BYOK) in the app header.",
      },
      { status: 503 }
    );
  }

  let body: { phrase1?: string; phrase2?: string; phrase3?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const p1 = typeof body.phrase1 === "string" ? body.phrase1.trim() : "";
  const p2 = typeof body.phrase2 === "string" ? body.phrase2.trim() : "";
  const p3 = typeof body.phrase3 === "string" ? body.phrase3.trim() : "";

  if (!p1 || !p2 || !p3) {
    return NextResponse.json(
      { error: "phrase1, phrase2, and phrase3 are required (non-empty strings)." },
      { status: 400 }
    );
  }

  const phrasesBlock = `1) "${p1}"\n2) "${p2}"\n3) "${p3}"`;

  const userPrompt = (characterDescription: string) =>
    `Write ONE short joke in character: ${characterDescription}

You MUST weave in, reference, or riff on ALL THREE of these words or phrases in the same joke (use each meaningfully—not just a list):

${phrasesBlock}

Output ONLY the joke text—no title, no preamble, no character label.`;

  try {
    const [joke1, joke2, joke3] = await Promise.all([
      chatCompletion(TRADITIONALIST, userPrompt("a 70-year-old traditionalist"), {
        temperature: 0.85,
        maxTokens: 450,
        apiKey,
      }),
      chatCompletion(CLOWN, userPrompt("a circus clown"), {
        temperature: 0.95,
        maxTokens: 500,
        apiKey,
      }),
      chatCompletion(FUNNIEST, userPrompt("the funniest person on earth"), {
        temperature: 0.9,
        maxTokens: 450,
        apiKey,
      }),
    ]);

    const phrases = [p1, p2, p3];

    return NextResponse.json({
      jokes: [
        {
          id: "traditionalist",
          title: "The traditionalist (70)",
          phrases,
          text: joke1.trim(),
        },
        {
          id: "clown",
          title: "The clown",
          phrases,
          text: joke2.trim(),
        },
        {
          id: "funniest",
          title: "The funniest on earth",
          phrases,
          text: joke3.trim(),
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Joke generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
