import Anthropic from "@anthropic-ai/sdk";
import type { LlmRequest, LlmResponse } from "./types";

export type AnthropicRequest = Omit<LlmRequest, "provider"> & { provider?: "anthropic" };

export function createAnthropicClient(apiKey?: string) {
  return new Anthropic({ apiKey });
}

export async function generateAnthropicText(
  request: AnthropicRequest,
  client = createAnthropicClient(),
): Promise<LlmResponse> {
  const message = await client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens ?? 1024,
    messages: [{ role: "user", content: request.input }],
    ...(request.system ? { system: request.system } : {}),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    provider: "anthropic",
    model: request.model,
    text,
    raw: message,
  };
}
