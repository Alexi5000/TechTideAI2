import OpenAI from "openai";
import type { LlmRequest, LlmResponse } from "./types";

export type OpenAIRequest = Omit<LlmRequest, "provider"> & { provider?: "openai" };

export function createOpenAIClient(apiKey?: string) {
  return new OpenAI({ apiKey });
}

export async function generateOpenAIText(
  request: OpenAIRequest,
  client = createOpenAIClient(),
): Promise<LlmResponse> {
  const response = await client.responses.create({
    model: request.model,
    input: request.input,
    ...(request.system ? { instructions: request.system } : {}),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_output_tokens: request.maxTokens } : {}),
  });

  return {
    provider: "openai",
    model: request.model,
    text: response.output_text ?? "",
    raw: response,
  };
}
