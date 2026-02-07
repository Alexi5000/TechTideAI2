import { describe, expect, it, vi } from "vitest";
import { generateOpenAIEmbeddings, generateOpenAIText } from "./openai.js";

describe("openai adapter", () => {
  it("generates text using the responses API", async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: "Hello from OpenAI" }),
      },
    };

    const result = await generateOpenAIText(
      {
        model: "gpt-4o-mini",
        input: "Hi",
        system: "Be helpful",
        temperature: 0.2,
        maxTokens: 64,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
    );

    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        input: "Hi",
        stream: false,
        instructions: "Be helpful",
        temperature: 0.2,
        max_output_tokens: 64,
      }),
    );
    expect(result.text).toBe("Hello from OpenAI");
  });

  it("generates embeddings", async () => {
    const client = {
      embeddings: {
        create: vi
          .fn()
          .mockResolvedValue({ model: "text-embedding-3-small", data: [{ embedding: [0.1, 0.2] }] }),
      },
    };

    const result = await generateOpenAIEmbeddings(
      {
        model: "text-embedding-3-small",
        input: "hello",
        dimensions: 2,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
    );

    expect(client.embeddings.create).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "hello",
      dimensions: 2,
    });
    expect(result.embeddings).toEqual([[0.1, 0.2]]);
  });
});
