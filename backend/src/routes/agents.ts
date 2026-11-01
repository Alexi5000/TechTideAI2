import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { agentRegistry, getAgentById, createMastraRuntime } from "@techtide/agents";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { createAgentExecutionService, createAgentLookup, ApprovalService } from "../services/index.js";
import { createInMemoryApprovalRepository, type IApprovalRepository } from "../repositories/approval-repository.js";
import { supabase } from "../services/supabase.js";
import { AgentNotFoundError, PersistenceUnavailableError } from "../domain/index.js";

const runAgentSchema = z.object({
  input: z.record(z.string(), z.unknown()).default({}),
  orgId: z.guid().transform((value) => value.toLowerCase()),
});

export async function registerAgentRoutes(app: FastifyInstance, approvalRepository: IApprovalRepository = createInMemoryApprovalRepository()) {
  if (!app.hasDecorator("rateLimit")) await app.register(rateLimit, {global:false});
  // Assemble dependencies (could move to DI container)
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);
  const agentRuntime = createMastraRuntime();
  const agentLookup = createAgentLookup();
  const approvalService = new ApprovalService({ repository: approvalRepository });

  const executionService = createAgentExecutionService({
    runService,
    approvalService,
    approvalRepository,
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
    {config:{rateLimit:{max:60,timeWindow:"1 minute"}}},
    async (request, reply) => {
      const { id: agentId } = request.params;

      try {
        const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? "");
        if (!match) return reply.code(401).send({error:"Unauthorized"});
        if (!supabase) return reply.code(503).send({error:"Authorization unavailable"});
        let userId: string;
        try {
          const {data,error} = await supabase.auth.getUser(match[1]);
          if (error || !data.user) return reply.code(401).send({error:"Unauthorized"});
          userId = data.user.id;
        } catch { return reply.code(503).send({error:"Authorization unavailable"}); }
        const payload = runAgentSchema.parse(request.body);
        try {
          const {data,error} = await supabase.from("org_members").select("role").eq("org_id",payload.orgId).eq("user_id",userId).maybeSingle();
          if (error) return reply.code(503).send({error:"Authorization unavailable"});
          if (!data || !["owner","admin"].includes(data.role)) return reply.code(403).send({error:"Forbidden"});
        } catch { return reply.code(503).send({error:"Authorization unavailable"}); }

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
