/**
 * Run Events Routes - Presentation Layer
 *
 * HTTP handlers for run event audit trails.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { supabase } from "../services/supabase.js";
import { PersistenceUnavailableError, RunNotFoundError } from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

export async function registerRunEventRoutes(app: FastifyInstance) {
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);

  const handleError = (error: unknown, reply: FastifyReply) => {
    const validationResult = handleValidationError(error, reply);
    if (validationResult) return validationResult;

    if (error instanceof PersistenceUnavailableError) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message: "Database not configured. Please set up Supabase.",
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

  app.get<{ Params: { id: string } }>(
    "/api/runs/:id/events",
    async (request, reply) => {
      try {
        const runId = safeParse(z.string().uuid(), request.params.id);
        const events = await runService.listRunEvents(runId);
        return reply.send({ events });
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );
}
