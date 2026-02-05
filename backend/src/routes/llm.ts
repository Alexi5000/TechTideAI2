import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env";
import { generateText } from "../services/llm";

const requestSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).default(env.DEFAULT_LLM_PROVIDER),
  model: z.string(),
  input: z.string(),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
});

export async function registerLlmRoutes(app: FastifyInstance) {
  app.post("/api/llm", async (request, reply) => {
    const payload = requestSchema.parse(request.body);
    const response = await generateText(payload);
    return reply.send(response);
  });
}
