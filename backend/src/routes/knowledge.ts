/**
 * Knowledge Routes - Presentation Layer
 *
 * HTTP handlers for knowledge indexing and vector search.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createKnowledgeRepository,
  createKnowledgeVectorRepository,
} from "../repositories/index.js";
import { createKnowledgeService, supabase } from "../services/index.js";
import { env } from "../config/env.js";
import {
  PersistenceUnavailableError,
  EmbeddingProviderUnavailableError,
} from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

const createDocumentSchema = z.object({
  orgId: z.string().uuid().default(env.DEFAULT_ORG_ID),
  title: z.string().min(1),
  source: z.string().min(1),
  collection: z.string().min(1).optional(),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});

const searchSchema = z.object({
  orgId: z.string().uuid().default(env.DEFAULT_ORG_ID),
  query: z.string().min(3),
  limit: z.number().int().min(1).max(20).default(5),
  collections: z.array(z.string().min(1)).optional(),
});

export async function registerKnowledgeRoutes(app: FastifyInstance) {
  const repository = createKnowledgeRepository(supabase);
  const vectorRepository = createKnowledgeVectorRepository();
  const knowledgeService = createKnowledgeService({
    repository,
    vectorRepository,
  });

  const handleError = (error: unknown, reply: FastifyReply) => {
    // Check for validation errors first (returns 400)
    const validationResult = handleValidationError(error, reply);
    if (validationResult) return validationResult;

    // Domain errors
    if (error instanceof PersistenceUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    if (error instanceof EmbeddingProviderUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: error.message,
      });
    }
    throw error;
  };

  // POST /api/knowledge/documents - Create + index a knowledge document
  app.post("/api/knowledge/documents", async (request, reply) => {
    try {
      const payload = safeParse(createDocumentSchema, request.body);
      const result = await knowledgeService.indexDocument(payload);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /api/knowledge/documents/:id - Fetch a document
  app.get<{ Params: { id: string } }>(
    "/api/knowledge/documents/:id",
    async (request, reply) => {
      try {
        const id = safeParse(z.string().uuid(), request.params.id);
        const document = await knowledgeService.getDocument(id);
        if (!document) {
          return reply.status(404).send({ error: "Not Found" });
        }
        return reply.send(document);
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // POST /api/knowledge/search - Vector search over knowledge chunks
  app.post("/api/knowledge/search", async (request, reply) => {
    try {
      const payload = safeParse(searchSchema, request.body);
      const results = await knowledgeService.search(
        payload.orgId,
        payload.query,
        payload.limit,
        payload.collections ?? null,
      );
      return reply.send({ results });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
