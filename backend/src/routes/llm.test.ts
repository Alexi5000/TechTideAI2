import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/llm.js", () => ({ generateText: vi.fn().mockResolvedValue({ text: "ok" }) }));
import { generateText } from "../services/llm.js";
import { registerLlmRoutes } from "./llm.js";

beforeEach(() => vi.clearAllMocks());
describe("generation bounds", () => {
  it("rejects excessive output before provider calls", async () => {
    const app = Fastify();
    await registerLlmRoutes(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/llm",
      payload: { model: "test", input: "hello", maxTokens: 10000000 },
    });
    expect(response.statusCode).toBe(400);
    expect(generateText).not.toHaveBeenCalled();
    await app.close();
  });
  it("bounds the default while preserving valid requests", async () => {
    const app = Fastify();
    await registerLlmRoutes(app);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          payload: { model: "test", input: "hello" },
        })
      ).statusCode,
    ).toBe(200);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 1024 }));
    await app.close();
  });
});
