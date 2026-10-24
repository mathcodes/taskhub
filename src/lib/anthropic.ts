import { getAnthropicApiKey, getAnthropicModel } from "@/lib/env";

type AnthropicContentBlock = { type: string; text?: string };

/**
 * Single-turn Claude message (Messages API). Server-side only.
 */
export async function anthropicMessage(params: {
  system: string;
  user: string;
  maxTokens?: number;
  /** Visitor-supplied key (BYOK); falls back to ANTHROPIC_API_KEY on the server. */
  apiKey?: string;
}): Promise<string> {
  const key = params.apiKey || getAnthropicApiKey();
  if (!key) {
    throw new AnthropicKeyMissingError();
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
    if (res.status === 401 || res.status === 403) {
      throw new AnthropicKeyMissingError("Anthropic rejected the API key. Check it under API keys and try again.");
    }
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: AnthropicContentBlock[] };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  return text.trim();
}

/** Raised when no usable Anthropic key is available; routes map it to HTTP 401. */
export class AnthropicKeyMissingError extends Error {
  constructor(message = "Add your Anthropic API key (API keys button, top right) to use this feature.") {
    super(message);
    this.name = "AnthropicKeyMissingError";
  }
}
