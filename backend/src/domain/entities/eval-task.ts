/**
 * Eval Task Entity - Domain Core
 *
 * A single, deterministic, version-pinned task that exercises one capability of an agent.
 * Tasks live in `evals/fixtures/*.json` and are versioned with the suite.
 */

import { z } from "zod";

export const EvalCategorySchema = z.enum([
  "format-compliance",
  "domain-reasoning",
  "tool-use",
  "memory-recall",
  "multi-step",
]);
export type EvalCategory = z.infer<typeof EvalCategorySchema>;

export const EvalDifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type EvalDifficulty = z.infer<typeof EvalDifficultySchema>;

/**
 * `expected` is intentionally flexible: deterministic scorers read `exact` or `regex`;
 * rubric scorers read `rubric`; LLM-judge scorers read `assertions: string[]`.
 */
export const EvalExpectedSchema = z
  .object({
    exact: z.unknown().optional(),
    regex: z.string().optional(),
    jsonSchema: z.record(z.string(), z.unknown()).optional(),
    rubric: z.string().optional(),
    assertions: z.array(z.string()).optional(),
  })
  .strict();
export type EvalExpected = z.infer<typeof EvalExpectedSchema>;

export const EvalTaskSchema = z
  .object({
    id: z.string().min(1),
    agentId: z.string().min(1),
    tier: z.enum(["ceo", "orchestrator", "worker"]),
    category: EvalCategorySchema,
    difficulty: EvalDifficultySchema,
    input: z.record(z.string(), z.unknown()),
    expected: EvalExpectedSchema,
    rubric: z.string().min(1),
    tags: z.array(z.string()).default([]),
    timeoutMs: z.number().int().min(1000).max(120_000).default(30_000),
  })
  .strict();

export type EvalTask = z.infer<typeof EvalTaskSchema>;

export function parseEvalTask(input: unknown): EvalTask {
  return EvalTaskSchema.parse(input);
}
