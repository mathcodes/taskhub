import { getOpenAIChatModel, getOpenAIKey } from "@/lib/env";

export async function chatCompletion(
  system: string,
  user: string,
  options?: { temperature?: number; maxTokens?: number; apiKey?: string }
): Promise<string> {
  const key = options?.apiKey?.trim() || getOpenAIKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = getOpenAIChatModel();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.maxTokens ?? 1200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return text;
}

export function stripJsonFence(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "");
  t = t.replace(/\s*```$/i, "");
  return t.trim();
}
