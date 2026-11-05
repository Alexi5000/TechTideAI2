/**
 * Run Routes - Presentation Layer
 *
 * HTTP handlers for run management. Validates input with Zod,
 * delegates to RunService, and returns structured responses.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { createRunRepository } from "../repositories/index.js";
import { createRunService } from "../services/run-service.js";
import { supabase } from "../services/supabase.js";
import { traceService } from "../services/trace-service.js";
import {
  PersistenceUnavailableError,
  InvalidStatusTransitionError,
  RunNotFoundError,
} from "../domain/index.js";

const createRunSchema = z.object({
  orgId: z.guid(),
  agentId: z.string(),
  input: z.record(z.string(), z.unknown()).default({}),
});

const listRunsQuerySchema = z.object({
  orgId: z.guid(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(100).optional()),
});

export async function registerRunRoutes(app: FastifyInstance) {
  if (!app.hasDecorator("rateLimit")) await app.register(rateLimit, {global:false});
  const limit = {config:{rateLimit:{max:60,timeWindow:"1 minute"}}};
  const repository = createRunRepository(supabase);
  const runService = createRunService(repository);

  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? "");
    if (!match) { await reply.code(401).send({error:"Unauthorized"}); return null; }
    if (!supabase) { await reply.code(503).send({error:"Authorization unavailable"}); return null; }
    try {
      const {data,error} = await supabase.auth.getUser(match[1]);
      if (error || !data.user) { await reply.code(401).send({error:"Unauthorized"}); return null; }
      return data.user.id;
    } catch { await reply.code(503).send({error:"Authorization unavailable"}); return null; }
  }

  async function authorize(userId: string, orgId: string, write: boolean, reply: FastifyReply): Promise<boolean> {
    if (!supabase) { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
    try {
      const {data,error} = await supabase.from("org_members").select("role").eq("org_id",orgId).eq("user_id",userId).maybeSingle();
      if (error) { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
      if (!data || !["owner","admin","member"].includes(data.role) || (write && !["owner","admin"].includes(data.role))) {
        await reply.code(403).send({error:"Forbidden"}); return false;
      }
      return true;
    } catch { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
  }

  async function authorizedRun(request: FastifyRequest<{Params:{id:string}}>, reply: FastifyReply, write: boolean) {
    const user = await authenticate(request, reply);
    if (!user) return null;
    const id = z.guid().parse(request.params.id);
    const run = await runService.getRun(id);
    if (!run) { await reply.code(404).send({error:"Not Found"}); return null; }
    if (!await authorize(user, run.orgId, write, reply)) return null;
    return run;
  }

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
  app.get("/api/runs", limit, async (request, reply) => {
    try {
      const user = await authenticate(request, reply);
      if (!user) return;
      const query = listRunsQuerySchema.parse(request.query);
      if (!await authorize(user, query.orgId, false, reply)) return;
      const runs = await runService.listRuns(query.orgId, query.limit);
      return reply.send(runs);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // GET /api/runs/:id - Get a single run by ID
  app.get<{ Params: { id: string } }>("/api/runs/:id", limit, async (request, reply) => {
    try {
      const run = await authorizedRun(request, reply, false);
      if (!run) return;
      return reply.send(run);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/runs - Create a new run (internal use, called by agent execution)
  app.post("/api/runs", limit, async (request, reply) => {
    try {
      const user = await authenticate(request, reply);
      if (!user) return;
      const payload = createRunSchema.parse(request.body);
      if (!await authorize(user, payload.orgId, true, reply)) return;
      const run = await runService.createRun(payload);
      return reply.status(201).send(run);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/runs/:id/cancel - Cancel a run
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/cancel",
    limit,
    async (request, reply) => {
      try {
        const existing = await authorizedRun(request, reply, true);
        if (!existing) return;
        const run = await runService.cancelRun(existing.id);
        return reply.send(run);
      } catch (error) {
        // Domain errors handled centrally
        return handleDomainError(error, reply);
      }
    },
  );

  // GET /api/runs/:id/events - Phase 2.1 evidence-plane surface.
  app.get<{ Params: { id: string } }>(
    "/api/runs/:id/events",
    limit,
    async (request, reply) => {
      try {
        const run = await authorizedRun(request, reply, false);
        if (!run) return;
        const events = await repository.findEventsByRunId(run.id);
        return reply.send(events);
      } catch (error) {
        return handleDomainError(error, reply);
      }
    },
  );

  // GET /api/runs/:id/trace - Phase 8.7 enriched trace tree (eval.* attributes).
  // Resolves the runId via the trace service's runId→traceId index; the
  // originating span (e.g. the agent-execution-service or three-agent-harness
  // root span) binds runId at startSpan() time.
  app.get<{ Params: { id: string } }>(
    "/api/runs/:id/trace",
    limit,
    async (request, reply) => {
      try {
        const run = await authorizedRun(request, reply, false);
        if (!run) return;
        const tree = traceService.getTraceTreeForRun(run.id);
        if (!tree) {
          return reply.status(404).send({
            error: "Not Found",
            message: `no trace for run ${run.id}; either the run never executed or trace buffering was reset.`,
          });
        }
        return reply.send(tree);
      } catch (error) {
        return handleDomainError(error, reply);
      }
    },
  );
}
