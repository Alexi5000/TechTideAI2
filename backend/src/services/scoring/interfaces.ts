/**
 * Scorer interface contract.
 *
 * A scorer takes the agent's output plus the task's expected shape and returns a
 * normalized 0..1 score plus a rationale. Determinism is the contract: any given
 * (task, output) pair must always produce the same `score` and `passed`.
 *
 * Scoring breakdown is per-scorer so the harness can compute a weighted average
 * and surface "which scorer marked this down" to the dashboard.
 *
 * Phase 8: `ScoringResult` and `toBreakdown` carry an optional `meta` channel
 * for scorers that want to publish structured signals (e.g. plateau detection,
 * per-axis grades) alongside the headline score. The eval harness loop reads
 * `meta.rollingDelta`; the dashboard reads `meta.axis.*`.
 */

import type { EvalExpected, EvalTask } from "../../domain/entities/eval-task.js";
import type {
  ScorerKind,
  ScoringBreakdown,
  ScoringBreakdownMeta,
} from "../../domain/entities/eval-result.js";

export interface ScorerContext {
  readonly task: EvalTask;
  readonly expected: EvalExpected;
  readonly agentOutput: unknown;
  readonly judgeModel?: string | undefined;
  /** Free-form history provided by the caller (e.g. rolling scores for plateau). */
  readonly history?: readonly { score: number; iteration: number; meta?: Record<string, unknown> }[] | undefined;
}

export interface ScoringResult {
  readonly score: number;
  readonly passed: boolean;
  readonly rationale: string;
  readonly durationMs: number;
  readonly tokensUsed?: number | undefined;
  readonly meta?: ScoringBreakdownMeta;
}

export interface Scorer {
  readonly kind: ScorerKind;
  score(context: ScorerContext): Promise<ScoringResult>;
}

export function toBreakdown(
  scorer: Scorer,
  result: ScoringResult,
  weight: number,
): ScoringBreakdown {
  return {
    scorer: scorer.kind,
    score: result.score,
    weight,
    passed: result.passed,
    rationale: result.rationale,
    durationMs: result.durationMs,
    ...(result.meta ? { meta: result.meta } : {}),
  };
}
