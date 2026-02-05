import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { agentRegistry, getAgentById, createMastraRuntime } from "@techtide/agents";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { createAgentExecutionService, createAgentLookup } from "../services/index.js";
import { supabase } from "../services/supabase.js";
import { AgentNotFoundError, PersistenceUnavailableError } from "../domain/index.js";

// Default org ID for MVP (matches seed.sql)
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

const runAgentSchema = z.object({
  input: z.record(z.unknown()).default({}),
  orgId: z.string().uuid().default(DEFAULT_ORG_ID),
});

export async function registerAgentRoutes(app: FastifyInstance) {
  // Assemble dependencies (could move to DI container)
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);
  const agentRuntime = createMastraRuntime();
  const agentLookup = createAgentLookup();

  const executionService = createAgentExecutionService({
    runService,
    agentRuntime,
    agentLookup,
    logger: {
      error: (msg) => app.log.error(msg),
      info: (msg) => app.log.info(msg),
    },
  });

  app.get("/api/agents", async () => ({
    ceo: agentRegistry.ceo,
    orchestrators: agentRegistry.orchestrators,
    workers: agentRegistry.workers,
  }));

  app.get<{ Params: { id: string } }>("/api/agents/:id", async (request, reply) => {
    const agent = getAgentById(request.params.id);
    if (!agent) {
      return reply.status(404).send({ error: "Agent not found" });
    }
    return agent;
  });

  // POST /api/agents/:id/run - Execute an agent
  app.post<{ Params: { id: string } }>(
    "/api/agents/:id/run",
    async (request, reply) => {
      const { id: agentId } = request.params;

      try {
        const payload = runAgentSchema.parse(request.body);

        // Delegate to execution service (business logic lives there)
        const run = await executionService.executeAgent(
          agentId,
          payload.input,
          payload.orgId,
        );

        // Return 202 Accepted with run details for polling
        return reply.status(202).send({
          ...run,
          message: "Run created. Poll GET /api/runs/:id for status updates.",
        });
      } catch (error) {
        // Map domain errors to HTTP responses
        if (error instanceof AgentNotFoundError) {
          return reply.status(404).send({ error: "Agent not found" });
        }
        if (error instanceof PersistenceUnavailableError) {
          return reply.status(503).send({
            error: "Service Unavailable",
            message: "Database not configured. Please set up Supabase.",
          });
        }
        throw error;
      }
    },
  );
}
