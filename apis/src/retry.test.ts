import { describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { withRetry, LlmSdkError, DEFAULT_RETRY_CONFIG } from "./retry.js";

const FAST_CONFIG = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 };

function makeOpenAIRateLimitError(): Error {
  const err = new Error("rate limited");
  Object.setPrototypeOf(err, OpenAI.RateLimitError.prototype);
  return err;
}

function makeOpenAIAuthError(): Error {
  const err = new Error("bad key");
  Object.setPrototypeOf(err, OpenAI.AuthenticationError.prototype);
  return err;
}

function makeAnthropicServerError(): Error {
  const err = new Error("internal");
  Object.setPrototypeOf(err, Anthropic.InternalServerError.prototype);
  return err;
}

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, "openai", FAST_CONFIG);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeOpenAIRateLimitError())
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, "openai", FAST_CONFIG);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on auth error", async () => {
    const fn = vi.fn().mockRejectedValue(makeOpenAIAuthError());

    await expect(withRetry(fn, "openai", FAST_CONFIG)).rejects.toThrow(LlmSdkError);
    expect(fn).toHaveBeenCalledTimes(1);

    try {
      await withRetry(fn, "openai", FAST_CONFIG);
    } catch (error) {
      expect(error).toBeInstanceOf(LlmSdkError);
      expect((error as LlmSdkError).errorType).toBe("auth");
      expect((error as LlmSdkError).provider).toBe("openai");
    }
  });

  it("exhausts retries and throws", async () => {
    const fn = vi.fn().mockRejectedValue(makeAnthropicServerError());

    await expect(withRetry(fn, "anthropic", FAST_CONFIG)).rejects.toThrow(LlmSdkError);
    expect(fn).toHaveBeenCalledTimes(FAST_CONFIG.maxRetries + 1);
  });

  it("classifies unknown errors as non-retryable", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("something unexpected"));

    await expect(withRetry(fn, "openai", FAST_CONFIG)).rejects.toThrow(LlmSdkError);
    expect(fn).toHaveBeenCalledTimes(1);

    try {
      await withRetry(fn, "openai", FAST_CONFIG);
    } catch (error) {
      expect((error as LlmSdkError).errorType).toBe("unknown");
    }
  });
});

describe("LlmSdkError", () => {
  it("includes provider and error type in message", () => {
    const original = new Error("test");
    const error = new LlmSdkError("anthropic", "rate_limit", original);

    expect(error.name).toBe("LlmSdkError");
    expect(error.provider).toBe("anthropic");
    expect(error.errorType).toBe("rate_limit");
    expect(error.message).toContain("anthropic");
    expect(error.message).toContain("rate_limit");
    expect(error.message).toContain("test");
    expect(error).toBeInstanceOf(LlmSdkError);
  });
});

describe("DEFAULT_RETRY_CONFIG", () => {
  it("has sensible production defaults", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
  });
});
