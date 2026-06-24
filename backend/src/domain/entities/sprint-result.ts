/**
 * SprintResult entity (Phase 8.4).
 *
 * The output of `ThreeAgentHarness.runSprint(contract)`. One SprintResult
 * contains the iteration-by-iteration record, the best iteration, the
 * pass/fail verdict, and the totals.
 */

import { z } from "zod";
import { EvalTaskResultSchema } from "./eval-result.js";

export const SprintIterationSchema = z
  .object({
    iteration: z.number().int().nonnegative(),
    agentOutput: z.unknown(),
    taskResult: EvalTaskResultSchema,
    /** Plateau verdict for this iteration, populated by PlateauScorer. */
    plateauDetected: z.boolean(),
    rollingDelta: z.number(),
  })
  .strict();
export type SprintIteration = z.infer<typeof SprintIterationSchema>;

export const SprintResultStatusSchema = z.enum([
  "succeeded",
  "failed",
  "max-iterations",
  "plateau",
  "errored",
]);
export type SprintResultStatus = z.infer<typeof SprintResultStatusSchema>;

export const SprintResultSchema = z
  .object({
    id: z.string(),
    contractId: z.string(),
    contractVersion: z.string(),
    status: SprintResultStatusSchema,
    iterations: z.array(SprintIterationSchema),
    bestIteration: z.number().int().nonnegative().nullable(),
    bestScore: z.number().min(0).max(1),
    totalTokens: z.number().int().nonnegative(),
    totalCostUsd: z.number().nonnegative(),
    startedAt: z.string(),
    completedAt: z.string(),
    failureReason: z.string().nullable(),
  })
  .strict();
export type SprintResult = z.infer<typeof SprintResultSchema>;

export function emptySprintResult(input: {
  id: string;
  contractId: string;
  contractVersion: string;
  startedAt: string;
}): SprintResult {
  return {
    id: input.id,
    contractId: input.contractId,
    contractVersion: input.contractVersion,
    status: "errored",
    iterations: [],
    bestIteration: null,
    bestScore: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    startedAt: input.startedAt,
    completedAt: input.startedAt,
    failureReason: "sprint did not start",
  };
}
