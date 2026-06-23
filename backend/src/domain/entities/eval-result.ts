/**
 * Eval Task Result Entity - Domain Core
 *
 * The outcome of running one EvalTask against one agent runtime, after scoring.
 *
 * Phase 8: `ScoringBreakdown` now carries an optional `meta` channel for scorers
 * (e.g. plateau-scorer, four-axis-grader) that want to publish structured
 * signals alongside the score. The eval harness loop reads `meta.rollingDelta`
 * to decide whether to stop; the dashboard reads `meta.axis.*` to render the
 * per-axis breakdown.
 */

import { z } from "zod";

export const ScorerKindSchema = z.enum([
  "exact-match",
  "regex",
  "json-schema",
  "llm-judge",
  "rubric-weighted",
  "four-axis-grader",
  "plateau-scorer",
]);
export type ScorerKind = z.infer<typeof ScorerKindSchema>;

/**
 * Optional side-channel for scorers. Always `Record<string, unknown>` so a
 * scorer can publish anything. Documented consumers:
 *   - plateau-scorer: { plateauDetected: bool, rollingDelta: number, windowSize: number }
 *   - four-axis-grader: { axes: { correctness, safety, completeness, quality }, thresholds: {...} }
 */
export const ScoringBreakdownMetaSchema = z
  .record(z.string(), z.unknown())
  .optional();
export type ScoringBreakdownMeta = z.infer<typeof ScoringBreakdownMetaSchema>;

export const ScoringBreakdownSchema = z
  .object({
    scorer: ScorerKindSchema,
    score: z.number().min(0).max(1),
    weight: z.number().min(0).max(1),
    passed: z.boolean(),
    rationale: z.string(),
    durationMs: z.number().int().nonnegative(),
    meta: ScoringBreakdownMetaSchema,
  })
  .strict();
export type ScoringBreakdown = z.infer<typeof ScoringBreakdownSchema>;

export const EvalTaskResultSchema = z
  .object({
    taskId: z.string(),
    agentId: z.string(),
    agentOutput: z.unknown(),
    score: z.number().min(0).max(1),
    passed: z.boolean(),
    latencyMs: z.number().int().nonnegative(),
    tokensUsed: z.number().int().nonnegative(),
    estimatedCostUsd: z.number().nonnegative(),
    scorers: z.array(ScoringBreakdownSchema),
    failureReason: z.string().nullable(),
    observedAt: z.string(),
  })
  .strict();

export type EvalTaskResult = z.infer<typeof EvalTaskResultSchema>;

export function parseEvalTaskResult(input: unknown): EvalTaskResult {
  return EvalTaskResultSchema.parse(input);
}
