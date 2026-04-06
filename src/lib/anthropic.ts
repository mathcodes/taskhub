import { getAnthropicApiKey, getAnthropicModel } from "@/lib/env";

type AnthropicContentBlock = { type: string; text?: string };

/**
 * Single-turn Claude message (Messages API). Server-side only.
 */
export async function anthropicMessage(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const key = getAnthropicApiKey();
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const model = getAnthropicModel();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { content?: AnthropicContentBlock[] };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  return text.trim();
}
