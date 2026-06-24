/**
 * Eval Routes - Presentation Layer
 *
 * HTTP handlers for the eval harness surface. The runtime store is the
 * InMemoryEvalRunRepository; this is fine for a single-process backend and
 * keeps the surface usable in CI without a Supabase instance. Migrating to
 * Supabase is a one-file change (see eval-run-repository.ts).
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { createMastraRuntime } from "@techtide/agents";
import { EvalHarness } from "../services/eval-harness.js";
import { loadSuite, loadDefaultSuite } from "../services/eval-suite-loader.js";
import { createInMemoryEvalRunRepository } from "../repositories/eval-run-repository.js";
import { EvalSuiteNotFoundError, EvalRunNotFoundError, EvalRegressionDetectedError } from "../domain/index.js";
import { env } from "../config/env.js";

const repo = createInMemoryEvalRunRepository();

const runSuiteQuerySchema = z.object({
  suite: z.string().default("golden-tasks.v1"),
  baseline: z.string().default("none"),
  judgeModel: z.string().default(env.EVAL_DEFAULT_JUDGE_MODEL),
  concurrency: z.coerce.number().int().min(1).max(32).default(1),
});

export async function registerEvalRoutes(app: FastifyInstance): Promise<void> {
  const handleDomainError = (error: unknown, reply: FastifyReply): FastifyReply => {
    if (error instanceof EvalSuiteNotFoundError) {
      return reply.status(404).send({ error: "Not Found", message: error.message });
    }
    if (error instanceof EvalRunNotFoundError) {
      return reply.status(404).send({ error: "Not Found", message: error.message });
    }
    if (error instanceof EvalRegressionDetectedError) {
      return reply.status(409).send({ error: "Conflict", message: error.message });
    }
    throw error;
  };

  // GET /api/evals/suites - List known suite fixtures.
  app.get("/api/evals/suites", async (_request, reply) => {
    const suite = await loadDefaultSuite();
    return reply.send([{ id: suite.id, version: suite.version, taskCount: suite.tasks.length }]);
  });

  // GET /api/evals/runs - List recent runs.
  app.get("/api/evals/runs", async (request, reply) => {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        suite: z.string().optional(),
      })
      .parse(request.query);

    const runs = query.suite
      ? await repo.listBySuite(query.suite, query.limit)
      : await repo.listRecent(query.limit);
    return reply.send(runs);
  });

  // GET /api/evals/runs/:id - Get a single eval run.
  app.get<{ Params: { id: string } }>("/api/evals/runs/:id", async (request, reply) => {
    const run = await repo.findById(request.params.id);
    if (!run) return reply.status(404).send({ error: "Not Found", message: "eval run not found" });
    return reply.send(run);
  });

  // POST /api/evals/run - Trigger a new eval run.
  app.post("/api/evals/run", async (request, reply) => {
    try {
      const opts = runSuiteQuerySchema.parse(request.query ?? {});
      const suite = await loadSuite(opts.suite);
      const baseline = opts.baseline === "latest"
        ? await repo.findLatestBySuite(suite.id)
        : opts.baseline === "none"
          ? null
          : await repo.findById(opts.baseline);

      const harness = new EvalHarness({
        agentRuntime: createMastraRuntime(),
        concurrency: opts.concurrency,
      });
      const run = await harness.runSuite({
        suite,
        baseline: baseline ?? undefined,
        judgeModel: opts.judgeModel,
      });
      await repo.save(run);
      return reply.status(201).send(run);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });
}
