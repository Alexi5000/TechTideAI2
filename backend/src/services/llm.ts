import {
  createAnthropicClient,
  createOpenAIClient,
  generateAnthropicText,
  generateOpenAIText,
  type LlmRequest,
  type LlmResponse,
} from "@techtide/apis";
import { env } from "../config/env.js";

type OpenAIClient = ReturnType<typeof createOpenAIClient>;
type AnthropicClient = ReturnType<typeof createAnthropicClient>;

let openaiClient: OpenAIClient | undefined;
let anthropicClient: AnthropicClient | undefined;

function getOpenAIClient(): OpenAIClient {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  openaiClient ??= createOpenAIClient(env.OPENAI_API_KEY);
  return openaiClient;
}

function getAnthropicClient(): AnthropicClient {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  anthropicClient ??= createAnthropicClient(env.ANTHROPIC_API_KEY);
  return anthropicClient;
}

export async function generateText(request: LlmRequest): Promise<LlmResponse> {
  if (request.provider === "openai") {
    const { provider: _, ...rest } = request;
    return generateOpenAIText(rest, getOpenAIClient());
  }

  const { provider: _, ...rest } = request;
  return generateAnthropicText(rest, getAnthropicClient());
}
