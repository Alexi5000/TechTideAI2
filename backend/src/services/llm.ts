import {
  createAnthropicClient,
  createOpenAIClient,
  generateAnthropicText,
  generateOpenAIText,
  type LlmRequest,
  type LlmResponse,
} from "@techtide/apis";
import { env } from "../config/env.js";
import { LlmApiKeyMissingError } from "../domain/index.js";

let openaiClient: ReturnType<typeof createOpenAIClient> | null = null;
let anthropicClient: ReturnType<typeof createAnthropicClient> | null = null;

export async function generateText(request: LlmRequest): Promise<LlmResponse> {
  if (request.provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new LlmApiKeyMissingError("openai");
    }
    openaiClient ??= createOpenAIClient(env.OPENAI_API_KEY);
    const { provider: _, ...rest } = request;
    return generateOpenAIText(rest, openaiClient);
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new LlmApiKeyMissingError("anthropic");
  }

  anthropicClient ??= createAnthropicClient(env.ANTHROPIC_API_KEY);
  const { provider: _, ...rest } = request;
  return generateAnthropicText(rest, anthropicClient);
}
