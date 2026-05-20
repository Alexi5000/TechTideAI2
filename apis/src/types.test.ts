import { describe, expect, it } from "vitest";
import type { EmbeddingResponse, LlmResponse } from "./types.js";

describe("provider response contracts", () => {
  it("supports text generation responses from named providers", () => {
    const response: LlmResponse = {
      provider: "openai",
      model: "gpt-5.5",
      text: "ready",
    };

    expect(response.provider).toBe("openai");
    expect(response.text).toBe("ready");
  });

  it("supports embedding batches", () => {
    const response: EmbeddingResponse = {
      model: "text-embedding-3-large",
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    };

    expect(response.embeddings).toHaveLength(2);
    expect(response.embeddings[0]).toHaveLength(2);
  });
});
