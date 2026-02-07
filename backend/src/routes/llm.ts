import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { generateText } from "../services/llm.js";
import { LlmApiKeyMissingError, LlmProviderUnavailableError } from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

const requestSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).default(env.DEFAULT_LLM_PROVIDER),
  model: z.string(),
  input: z.string(),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
});

export async function registerLlmRoutes(app: FastifyInstance) {
  const handleError = (error: unknown, reply: FastifyReply) => {
    // Check for validation errors first (returns 400)
    const validationResult = handleValidationError(error, reply);
    if (validationResult) return validationResult;

    // Domain errors
    if (error instanceof LlmApiKeyMissingError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: `LLM provider not configured: ${error.provider}`,
      });
    }
    if (error instanceof LlmProviderUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    throw error;
  };

  app.post("/api/llm", async (request, reply) => {
    try {
      const payload = safeParse(requestSchema, request.body);
      const response = await generateText(payload);
      return reply.send(response);
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
