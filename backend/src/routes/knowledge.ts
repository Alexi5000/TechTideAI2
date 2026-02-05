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
import {
  PersistenceUnavailableError,
  EmbeddingProviderUnavailableError,
} from "../domain/index.js";

// Default org ID for MVP (matches seed.sql)
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

const createDocumentSchema = z.object({
  orgId: z.string().uuid().default(DEFAULT_ORG_ID),
  title: z.string().min(1),
  source: z.string().min(1),
  collection: z.string().min(1).optional(),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});

const searchSchema = z.object({
  orgId: z.string().uuid().default(DEFAULT_ORG_ID),
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

  const handleDomainError = (error: unknown, reply: FastifyReply) => {
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
      const payload = createDocumentSchema.parse(request.body);
      const result = await knowledgeService.indexDocument(payload);
      return reply.status(201).send(result);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // GET /api/knowledge/documents/:id - Fetch a document
  app.get<{ Params: { id: string } }>(
    "/api/knowledge/documents/:id",
    async (request, reply) => {
      try {
        const id = z.string().uuid().parse(request.params.id);
        const document = await knowledgeService.getDocument(id);
        if (!document) {
          return reply.status(404).send({ error: "Not Found" });
        }
        return reply.send(document);
      } catch (error) {
        return handleDomainError(error, reply);
      }
    },
  );

  // POST /api/knowledge/search - Vector search over knowledge chunks
  app.post("/api/knowledge/search", async (request, reply) => {
    try {
      const payload = searchSchema.parse(request.body);
      const results = await knowledgeService.search(
        payload.orgId,
        payload.query,
        payload.limit,
        payload.collections ?? null,
      );
      return reply.send({ results });
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });
}
