export type LlmProvider = "openai" | "anthropic";

export interface LlmRequest {
  provider: LlmProvider;
  model: string;
  input: string;
  system?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

export interface LlmResponse {
  provider: LlmProvider;
  model: string;
  text: string;
  raw?: unknown;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number | undefined;
}

export interface EmbeddingResponse {
  model: string;
  embeddings: number[][];
  raw?: unknown;
}
