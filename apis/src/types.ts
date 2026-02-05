export type LlmProvider = "openai" | "anthropic";

export interface LlmRequest {
  provider: LlmProvider;
  model: string;
  input: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResponse {
  provider: LlmProvider;
  model: string;
  text: string;
  raw?: unknown;
}
