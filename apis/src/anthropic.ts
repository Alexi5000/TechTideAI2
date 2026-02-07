import Anthropic from "@anthropic-ai/sdk";
import type { LlmRequest, LlmResponse } from "./types.js";
import { withRetry, type RetryConfig } from "./retry.js";

export type AnthropicRequest = Omit<LlmRequest, "provider"> & { provider?: "anthropic" };

export function createAnthropicClient(apiKey?: string) {
  return new Anthropic({ apiKey });
}

export async function generateAnthropicText(
  request: AnthropicRequest,
  client = createAnthropicClient(),
  retryConfig?: RetryConfig,
): Promise<LlmResponse> {
  const { model, input, system, temperature, maxTokens } = request;

  const options: Anthropic.MessageCreateParams = {
    model,
    max_tokens: maxTokens ?? 1024,
    messages: [{ role: "user", content: input }],
  };
  if (system) options.system = system;
  if (temperature !== undefined) options.temperature = temperature;

  const message = await withRetry(
    () => client.messages.create(options),
    "anthropic",
    retryConfig,
  );

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    provider: "anthropic",
    model,
    text,
    raw: message,
  };
}
