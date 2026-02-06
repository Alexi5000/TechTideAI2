/**
 * Insights Routes - Presentation Layer
 *
 * HTTP handlers for KPI dashboards, execution maps, and market intelligence.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { createKnowledgeRepository, createKnowledgeVectorRepository } from "../repositories/index.js";
import { supabase } from "../services/supabase.js";
import { createKpiService } from "../services/kpi-service.js";
import { createExecutionMapService } from "../services/execution-map-service.js";
import { createMarketIntelService } from "../services/market-intel-service.js";
import {
  EmbeddingProviderUnavailableError,
  LlmApiKeyMissingError,
  LlmProviderUnavailableError,
  PersistenceUnavailableError,
  RepositoryOperationError,
  VectorStoreUnavailableError,
} from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

const daysSchema = z.preprocess(
  (value) => (value === undefined ? 30 : value),
  z.coerce.number().int().min(1).max(365),
);

const daysQuerySchema = z.object({
  days: daysSchema,
  orgId: z.string().uuid().optional().default(env.DEFAULT_ORG_ID),
});

const marketIntelSchema = z.object({
  query: z.string().min(3),
  provider: z.enum(["openai", "anthropic"]).optional().default(env.DEFAULT_LLM_PROVIDER),
  model: z.string().optional(),
  collections: z.array(z.string().min(1)).optional(),
  orgId: z.string().uuid().optional().default(env.DEFAULT_ORG_ID),
});

export async function registerInsightsRoutes(app: FastifyInstance) {
  const kpiService = createKpiService(supabase);
  const executionMapService = createExecutionMapService(supabase);
  const knowledgeRepository = createKnowledgeRepository(supabase);
  const vectorRepository = createKnowledgeVectorRepository();
  const marketIntelService = createMarketIntelService({
    repository: knowledgeRepository,
    vectorRepository,
  });

  const handleError = (error: unknown, reply: FastifyReply) => {
    const validationResult = handleValidationError(error, reply);
    if (validationResult) return validationResult;

    if (error instanceof PersistenceUnavailableError || error instanceof RepositoryOperationError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    if (error instanceof VectorStoreUnavailableError || error instanceof EmbeddingProviderUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    if (error instanceof LlmApiKeyMissingError || error instanceof LlmProviderUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    throw error;
  };

  app.get("/api/insights/kpis", async (request, reply) => {
    try {
      const query = safeParse(daysQuerySchema, request.query);
      const result = await kpiService.getKpis(query.orgId, query.days);
      return reply.send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get("/api/insights/execution-map", async (request, reply) => {
    try {
      const query = safeParse(daysQuerySchema, request.query);
      const result = await executionMapService.getExecutionMap(query.orgId, query.days);
      return reply.send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post("/api/insights/market-intel", async (request, reply) => {
    try {
      const payload = safeParse(marketIntelSchema, request.body);
      const result = await marketIntelService.summarize({
        orgId: payload.orgId,
        query: payload.query,
        provider: payload.provider,
        collections: payload.collections ?? ["market-intel"],
        ...(payload.model ? { model: payload.model } : {}),
      });
      return reply.send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
