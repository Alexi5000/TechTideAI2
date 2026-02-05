/**
 * Run Routes - Presentation Layer
 *
 * HTTP handlers for run management. Validates input with Zod,
 * delegates to RunService, and returns structured responses.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { supabase } from "../services/supabase.js";
import {
  PersistenceUnavailableError,
  InvalidStatusTransitionError,
  RunNotFoundError,
} from "../domain/index.js";

const createRunSchema = z.object({
  orgId: z.string().uuid(),
  agentId: z.string(),
  input: z.record(z.unknown()).default({}),
});

const listRunsQuerySchema = z.object({
  orgId: z.string().uuid(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(100).optional()),
});

export async function registerRunRoutes(app: FastifyInstance) {
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);

  // Map domain errors to HTTP responses
  const handleDomainError = (error: unknown, reply: FastifyReply) => {
    if (error instanceof PersistenceUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: "Database not configured. Please set up Supabase.",
      });
    }
    if (error instanceof InvalidStatusTransitionError) {
      return reply.status(409).send({
        error: "Conflict",
        message: error.message,
      });
    }
    if (error instanceof RunNotFoundError) {
      return reply.status(404).send({
        error: "Not Found",
        message: error.message,
      });
    }
    throw error;
  };

  // GET /api/runs - List runs for an organization
  app.get("/api/runs", async (request, reply) => {
    try {
      const query = listRunsQuerySchema.parse(request.query);
      const runs = await runService.listRuns(query.orgId, query.limit);
      return reply.send(runs);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // GET /api/runs/:id - Get a single run by ID
  app.get<{ Params: { id: string } }>("/api/runs/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate UUID format
      const uuidSchema = z.string().uuid();
      const validatedId = uuidSchema.parse(id);

      const run = await runService.getRun(validatedId);

      if (!run) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Run not found: ${id}`,
        });
      }

      return reply.send(run);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/runs - Create a new run (internal use, called by agent execution)
  app.post("/api/runs", async (request, reply) => {
    try {
      const payload = createRunSchema.parse(request.body);
      const run = await runService.createRun(payload);
      return reply.status(201).send(run);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/runs/:id/cancel - Cancel a run
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/cancel",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const uuidSchema = z.string().uuid();
        const validatedId = uuidSchema.parse(id);

        const run = await runService.cancelRun(validatedId);
        return reply.send(run);
      } catch (error) {
        // Domain errors handled centrally
        return handleDomainError(error, reply);
      }
    },
  );
}
