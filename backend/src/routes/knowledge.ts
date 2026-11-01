/**
 * Knowledge Routes - Presentation Layer
 *
 * HTTP handlers for knowledge indexing and vector search.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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

const createDocumentSchema = z.object({
  orgId: z.guid().transform((value) => value.toLowerCase()),
  title: z.string().min(1),
  source: z.string().min(1),
  collection: z.string().min(1).optional(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const searchSchema = z.object({
  orgId: z.guid().transform((value) => value.toLowerCase()),
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

  async function authorize(request: FastifyRequest, reply: FastifyReply, orgId: string, write: boolean): Promise<boolean> {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? "");
    if (!match) { await reply.code(401).send({ error: "Unauthorized" }); return false; }
    if (!supabase) { await reply.code(503).send({ error: "Authorization unavailable" }); return false; }
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser(match[1]);
      if (authError || !auth.user) { await reply.code(401).send({ error: "Unauthorized" }); return false; }
      const { data: membership, error } = await supabase.from("org_members").select("role").eq("org_id", orgId).eq("user_id", auth.user.id).maybeSingle();
      if (error) { await reply.code(503).send({ error: "Authorization unavailable" }); return false; }
      if (!membership || !["owner", "admin", "member"].includes(membership.role) || (write && !["owner", "admin"].includes(membership.role))) {
        await reply.code(403).send({ error: "Forbidden" }); return false;
      }
      return true;
    } catch {
      await reply.code(503).send({ error: "Authorization unavailable" }); return false;
    }
  }

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
      if (!await authorize(request, reply, payload.orgId, true)) return;
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
        const id = z.guid().parse(request.params.id);
        const orgId = z.object({ orgId: z.guid().transform((value) => value.toLowerCase()) }).parse(request.query).orgId;
        if (!await authorize(request, reply, orgId, false)) return;
        const document = await knowledgeService.getDocument(id, orgId);
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
      if (!await authorize(request, reply, payload.orgId, false)) return;
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
