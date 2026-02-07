import { describe, expect, it, vi } from "vitest";
import { generateAnthropicText } from "./anthropic.js";

describe("anthropic adapter", () => {
  it("generates text using the messages API", async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "Hello from Anthropic" }],
        }),
      },
    };

    const result = await generateAnthropicText(
      {
        model: "claude-3-sonnet-20240229",
        input: "Hi",
        system: "Be helpful",
        temperature: 0.4,
        maxTokens: 128,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
    );

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-sonnet-20240229",
        max_tokens: 128,
        system: "Be helpful",
        temperature: 0.4,
        messages: [{ role: "user", content: "Hi" }],
      }),
    );
    expect(result.text).toBe("Hello from Anthropic");
  });
});
