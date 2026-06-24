/**
 * Eval Suite Entity - Domain Core
 *
 * A versioned bundle of EvalTasks plus the ScorerSpecs that should be applied to them.
 * Suites are immutable once published: changing a task means publishing a new version.
 */

import { z } from "zod";

import type { EvalTask } from "./eval-task.js";
import { EvalTaskSchema } from "./eval-task.js";
import type { ScorerKind } from "./eval-result.js";
import { ScorerKindSchema } from "./eval-result.js";

export const ScorerSpecSchema = z
  .object({
    kind: ScorerKindSchema,
    weight: z.number().min(0).max(1).default(1),
    passThreshold: z.number().min(0).max(1).default(0.7),
    /**
     * For `llm-judge`: the judge model version pin.
     * For `rubric-weighted`: rubric weight vector keyed by criterion name.
     */
    options: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type ScorerSpec = z.infer<typeof ScorerSpecSchema>;

export const EvalSuiteSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().default(""),
    tasks: z.array(EvalTaskSchema).min(1),
    scorers: z.array(ScorerSpecSchema).min(1),
    publishedAt: z.string(),
  })
  .strict();

export type EvalSuite = z.infer<typeof EvalSuiteSchema>;

export function parseEvalSuite(input: unknown): EvalSuite {
  return EvalSuiteSchema.parse(input);
}

/** Resolves which scorers apply to a task (currently: all suite scorers; per-task override reserved for future). */
export function resolveScorers(suite: EvalSuite, _task: EvalTask): readonly ScorerKind[] {
  return suite.scorers.map((s) => s.kind);
}
