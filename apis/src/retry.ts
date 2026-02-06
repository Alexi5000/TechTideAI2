/**
 * SDK Retry Utility
 *
 * Provides exponential backoff retry logic for LLM SDK calls.
 * Handles transient errors (rate limits, timeouts) while failing
 * fast on auth errors.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export type LlmErrorType = "rate_limit" | "auth" | "timeout" | "server" | "unknown";

export class LlmSdkError extends Error {
  constructor(
    public readonly provider: "openai" | "anthropic",
    public readonly errorType: LlmErrorType,
    public readonly originalError: unknown,
  ) {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    super(`${provider} ${errorType} error: ${message}`);
    this.name = "LlmSdkError";
    Object.setPrototypeOf(this, LlmSdkError.prototype);
  }
}

/**
 * Classify an error to determine retry behavior and error type.
 */
function classifyError(error: unknown): { type: LlmErrorType; retryable: boolean } {
  // OpenAI errors
  if (error instanceof OpenAI.RateLimitError) {
    return { type: "rate_limit", retryable: true };
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return { type: "timeout", retryable: true };
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return { type: "auth", retryable: false };
  }
  if (error instanceof OpenAI.InternalServerError) {
    return { type: "server", retryable: true };
  }

  // Anthropic errors
  if (error instanceof Anthropic.RateLimitError) {
    return { type: "rate_limit", retryable: true };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { type: "timeout", retryable: true };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { type: "auth", retryable: false };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return { type: "server", retryable: true };
  }

  return { type: "unknown", retryable: false };
}

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * @param fn - Async function to execute
 * @param provider - LLM provider for error classification
 * @param config - Retry configuration
 * @returns Promise resolving to function result
 * @throws LlmSdkError on unrecoverable or exhausted retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  provider: "openai" | "anthropic",
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const { type, retryable } = classifyError(error);

      // Don't retry auth errors
      if (!retryable) {
        throw new LlmSdkError(provider, type, error);
      }

      // Exhausted retries
      if (attempt >= config.maxRetries) {
        throw new LlmSdkError(provider, type, error);
      }

      // Wait before retry
      const delay = calculateDelay(attempt, config);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but satisfy TypeScript
  throw new LlmSdkError(provider, "unknown", lastError);
}
