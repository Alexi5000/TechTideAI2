import {
  createAnthropicClient,
  createOpenAIClient,
  generateAnthropicText,
  generateOpenAIText,
  type LlmRequest,
  type LlmResponse,
} from "@techtide/apis";
import { env } from "../config/env.js";

const openaiClient = createOpenAIClient(env.OPENAI_API_KEY);
const anthropicClient = createAnthropicClient(env.ANTHROPIC_API_KEY);

export async function generateText(request: LlmRequest): Promise<LlmResponse> {
  if (request.provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    const { provider: _, ...rest } = request;
    return generateOpenAIText(rest, openaiClient);
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const { provider: _, ...rest } = request;
  return generateAnthropicText(rest, anthropicClient);
}
