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
import { requestCancellation } from "../services/agent-execution-service.js";
import { supabase } from "../services/supabase.js";
import { env } from "../config/env.js";
import {
  PersistenceUnavailableError,
  InvalidStatusTransitionError,
  RunNotFoundError,
} from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

const createRunSchema = z.object({
  orgId: z.string().uuid().optional().default(env.DEFAULT_ORG_ID),
  agentId: z.string(),
  input: z.record(z.unknown()).default({}),
});

const listRunsQuerySchema = z.object({
  orgId: z.string().uuid().optional().default(env.DEFAULT_ORG_ID),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(100).optional()),
});

export async function registerRunRoutes(app: FastifyInstance) {
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);

  // Map errors to HTTP responses
  const handleError = (error: unknown, reply: FastifyReply) => {
    // Check for validation errors first (returns 400)
    const validationResult = handleValidationError(error, reply);
    if (validationResult) return validationResult;

    // Domain errors
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
      const query = safeParse(listRunsQuerySchema, request.query);
      const runs = await runService.listRuns(query.orgId, query.limit);
      return reply.send(runs);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /api/runs/:id - Get a single run by ID
  app.get<{ Params: { id: string } }>("/api/runs/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate UUID format
      const validatedId = safeParse(z.string().uuid(), id);

      const run = await runService.getRun(validatedId);

      if (!run) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Run not found: ${id}`,
        });
      }

      return reply.send(run);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /api/runs - Create a new run (internal use, called by agent execution)
  app.post("/api/runs", async (request, reply) => {
    try {
      const payload = safeParse(createRunSchema, request.body);
      const run = await runService.createRun(payload);
      return reply.status(201).send(run);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /api/runs/:id/cancel - Cancel a run
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/cancel",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const validatedId = safeParse(z.string().uuid(), id);

        // Signal cancellation to running execution (if any)
        const executionSignalled = requestCancellation(validatedId);

        // Update database status regardless
        const run = await runService.cancelRun(validatedId);

        await runService.addRunEvent(run.id, run.orgId, "execution_canceled", {
          requestedBy: "api",
          executionSignalled,
        });

        return reply.send({
          ...run,
          executionSignalled,
        });
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );
}
