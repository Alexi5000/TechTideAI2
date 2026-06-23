/**
 * Sprint Contract Entity (Phase 8.3).
 *
 * A SprintContract is the negotiated scope for one adversarial feedback loop
 * (Planner → Generator → Evaluator). It pins:
 *   - the one-line prompt seed,
 *   - which agents play which roles,
 *   - the acceptance criteria the Evaluator grades against,
 *   - the scorers (and per-scorer thresholds) the Evaluator uses,
 *   - the loop's stop discipline (max iterations, plateau window).
 *
 * Sprint contracts live in `evals/sprints/*.json`. They are versioned; bumping
 * `contractVersion` is a breaking change for the harness's loop. ADR 0006.
 */

import { z } from "zod";
import { ScorerSpecSchema } from "./eval-suite.js";

export const SprintContractSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    contractVersion: z.string().min(1).default("sprint-contract-v1"),
    description: z.string().default(""),
    prompt: z.string().min(1),
    generatorAgentId: z.string().min(1),
    evaluatorAgentId: z.string().min(1),
    acceptanceCriteria: z.array(z.string().min(1)).min(3).max(7),
    /** Rubric the evaluator grades against; passed into scorer contexts. */
    rubric: z.string().default(""),
    scorers: z.array(ScorerSpecSchema).min(1),
    passThreshold: z.number().min(0).max(1).default(0.7),
    maxIterations: z.number().int().min(1).max(20).default(5),
    plateauWindow: z.number().int().min(1).max(10).default(2),
    plateauTolerance: z.number().min(0).max(1).default(0.02),
    publishedAt: z.string().optional(),
  })
  .strict();

export type SprintContract = z.infer<typeof SprintContractSchema>;

export function parseSprintContract(input: unknown): SprintContract {
  return SprintContractSchema.parse(input);
}
