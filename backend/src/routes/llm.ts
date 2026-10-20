import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { generateText } from "../services/llm.js";

const requestSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).default(env.DEFAULT_LLM_PROVIDER),
  model: z.string().min(1).max(100),
  input: z.string().min(1).max(100_000),
  system: z.string().max(20_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).default(1024),
});

export async function registerLlmRoutes(app: FastifyInstance) {
  app.post("/api/llm", async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid generation request" });
    const payload = parsed.data;
    const response = await generateText(payload);
    return reply.send(response);
  });
}
