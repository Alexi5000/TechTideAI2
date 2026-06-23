/**
 * Sprint Routes - Presentation Layer
 *
 * HTTP handlers for the three-agent harness surface. Mirrors the eval routes
 * shape: list / get / run. Sprint runs are in-memory in dev; the same pattern
 * as eval runs (see `routes/evals.ts`).
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { createMastraRuntime } from "@techtide/agents";
import { ThreeAgentHarness } from "../services/three-agent-harness.js";
import { loadSprint } from "../cli/sprint-loader.js";
import { createInMemorySprintRepository } from "../repositories/sprint-repository.js";

const repo = createInMemorySprintRepository();

const listQuerySchema = z.object({
  contract: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const runQuerySchema = z.object({
  contract: z.string().default("well-scoped-sprint"),
  concurrency: z.coerce.number().int().min(1).max(8).default(1),
});

export async function registerSprintRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/sprints/runs
  app.get("/api/sprints/runs", async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const runs = query.contract
      ? await repo.listByContract(query.contract, query.limit)
      : await repo.listRecent(query.limit);
    return reply.send(runs);
  });

  // GET /api/sprints/runs/:id
  app.get<{ Params: { id: string } }>("/api/sprints/runs/:id", async (request, reply) => {
    const id = z.string().uuid().parse(request.params.id);
    const run = await repo.findById(id);
    if (!run) return reply.status(404).send({ error: "Not Found", message: "sprint run not found" });
    return reply.send(run);
  });

  // GET /api/sprints/contracts
  app.get("/api/sprints/contracts", async () => {
    // Single known contract for now; the surface is here so a future "load from disk"
    // can iterate without an API change.
    return [{ id: "well-scoped-sprint", path: "evals/sprints/well-scoped-sprint.v1.json" }];
  });

  // POST /api/sprints/run
  app.post("/api/sprints/run", async (request, reply) => {
    const query = runQuerySchema.parse(request.query ?? {});
    const contract = await loadSprint(query.contract);
    const harness = new ThreeAgentHarness({
      agentRuntime: createMastraRuntime(),
      concurrency: query.concurrency,
    });
    const run = await harness.runSprint({ contract });
    await repo.save(run);
    return reply.status(201).send(run);
  });
}
