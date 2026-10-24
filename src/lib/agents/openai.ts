import { getOpenAIChatModel, getOpenAIKey } from "@/lib/env";

type ChatMsg =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "user";
      content: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
    };

export async function chatCompletion(
  system: string,
  user: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    jsonMode?: boolean;
  }
): Promise<string> {
  const key = options?.apiKey?.trim() || getOpenAIKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = getOpenAIChatModel();
  const body: Record<string, unknown> = {
    model,
    temperature: options?.temperature ?? 0.4,
    max_tokens: options?.maxTokens ?? 1200,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

/**
 * Multimodal user message (e.g. vision). System prompt is plain text.
 */
export async function chatCompletionMessages(
  messages: ChatMsg[],
  options?: { temperature?: number; maxTokens?: number; apiKey?: string; jsonMode?: boolean }
): Promise<string> {
  const key = options?.apiKey?.trim() || getOpenAIKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = getOpenAIChatModel();
  const body: Record<string, unknown> = {
    model,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,
    messages,
  };
  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
