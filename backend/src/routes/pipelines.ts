/**
 * Pipeline Routes
 *
 * HTTP endpoints for multi-agent pipeline execution.
 * Follows the same pattern as agent routes: 202 Accepted, async execution.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createMastraRuntime } from "@techtide/agents";
import { env } from "../config/env.js";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { createPipelineExecutionService } from "../services/pipeline-execution-service.js";
import { supabase } from "../services/supabase.js";
import { tracer } from "../services/monitoring.js";
import { PersistenceUnavailableError } from "../domain/index.js";
import { safeParse, handleValidationError } from "../utils/validation.js";

const runPipelineSchema = z.object({
  input: z.record(z.unknown()).default({}),
  orgId: z.string().uuid().default(env.DEFAULT_ORG_ID),
});

export async function registerPipelineRoutes(app: FastifyInstance) {
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);
  const agentRuntime = createMastraRuntime({ tracer });

  const pipelineService = createPipelineExecutionService({
    runService,
    agentRuntime,
    logger: {
      error: (msg) => app.log.error(msg),
      info: (msg) => app.log.info(msg),
    },
  });

  // GET /api/pipelines — List available pipelines
  app.get("/api/pipelines", async () => ({
    pipelines: pipelineService.listAvailablePipelines(),
  }));

  // POST /api/pipelines/:id/run — Execute a pipeline
  app.post<{ Params: { id: string } }>(
    "/api/pipelines/:id/run",
    async (request, reply) => {
      const { id: pipelineId } = request.params;

      try {
        const payload = safeParse(runPipelineSchema, request.body);

        const run = await pipelineService.executePipeline(
          pipelineId,
          payload.input,
          payload.orgId,
        );

        return reply.status(202).send({
          runId: run.id,
          pipelineId,
          status: run.status,
          createdAt: run.createdAt,
        });
      } catch (error) {
        const validationResult = handleValidationError(error, reply);
        if (validationResult) return validationResult;

        if (error instanceof PersistenceUnavailableError) {
          return reply.status(503).send({
            error: "Service Unavailable",
            message: "Database not configured.",
          });
        }

        if (error instanceof Error && error.message.startsWith("Pipeline not found:")) {
          return reply.status(404).send({
            error: "Pipeline not found",
            message: error.message,
          });
        }

        throw error;
      }
    },
  );
}
