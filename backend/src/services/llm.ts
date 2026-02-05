import {
  createAnthropicClient,
  createOpenAIClient,
  generateAnthropicText,
  generateOpenAIText,
  type LlmRequest,
  type LlmResponse,
} from "@techtide/apis";
import { env } from "../config/env";

const openaiClient = createOpenAIClient(env.OPENAI_API_KEY);
const anthropicClient = createAnthropicClient(env.ANTHROPIC_API_KEY);

export async function generateText(request: LlmRequest): Promise<LlmResponse> {
  if (request.provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    return generateOpenAIText(request, openaiClient);
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  return generateAnthropicText(request, anthropicClient);
}
