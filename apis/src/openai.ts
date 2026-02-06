import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import type {
  LlmRequest,
  LlmResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from "./types.js";
import { withRetry, type RetryConfig } from "./retry.js";

export type OpenAIRequest = Omit<LlmRequest, "provider"> & { provider?: "openai" };
export type OpenAIEmbeddingRequest = EmbeddingRequest;

export function createOpenAIClient(apiKey?: string) {
  return new OpenAI({ apiKey });
}

export async function generateOpenAIText(
  request: OpenAIRequest,
  client = createOpenAIClient(),
  retryConfig?: RetryConfig,
): Promise<LlmResponse> {
  const { model, input, system, temperature, maxTokens } = request;

  const options: ResponseCreateParamsNonStreaming = {
    model,
    input,
    stream: false,
  };
  if (system) options.instructions = system;
  if (temperature !== undefined) options.temperature = temperature;
  if (maxTokens !== undefined) options.max_output_tokens = maxTokens;

  const response = await withRetry(
    () => client.responses.create(options),
    "openai",
    retryConfig,
  );

  return {
    provider: "openai",
    model,
    text: response.output_text ?? "",
    raw: response,
  };
}

export async function generateOpenAIEmbeddings(
  request: OpenAIEmbeddingRequest,
  client = createOpenAIClient(),
  retryConfig?: RetryConfig,
): Promise<EmbeddingResponse> {
  const response = await withRetry(
    () =>
      client.embeddings.create({
        model: request.model,
        input: request.input,
        ...(request.dimensions ? { dimensions: request.dimensions } : {}),
      }),
    "openai",
    retryConfig,
  );

  return {
    model: response.model,
    embeddings: response.data.map((item) => item.embedding),
    raw: response,
  };
}
