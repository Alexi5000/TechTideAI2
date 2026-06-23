/**
 * Eval Run Entity - Domain Core
 *
 * One execution of an EvalSuite. Aggregates per-task results plus provenance
 * (model version, scorer versions, wall-clock latency) so we can diff baseline
 * vs current and call regressions cleanly.
 */

import { z } from "zod";

import type { EvalTaskResult } from "./eval-result.js";

export const EvalRunStatusSchema = z.enum(["running", "succeeded", "failed", "canceled"]);
export type EvalRunStatus = z.infer<typeof EvalRunStatusSchema>;

export const EvalRunSummarySchema = z
  .object({
    suiteId: z.string(),
    suiteVersion: z.string(),
    passRate: z.number().min(0).max(1),
    meanScore: z.number().min(0).max(1),
    p50LatencyMs: z.number().int().nonnegative(),
    p95LatencyMs: z.number().int().nonnegative(),
    totalCostUsd: z.number().nonnegative(),
    regressionDeltaPct: z.number().nullable(),
  })
  .strict();
export type EvalRunSummary = z.infer<typeof EvalRunSummarySchema>;

export const EvalRunSchema = z
  .object({
    id: z.string(),
    suiteId: z.string(),
    suiteVersion: z.string(),
    status: EvalRunStatusSchema,
    startedAt: z.string(),
    completedAt: z.string().nullable(),
    baselineId: z.string().nullable(),
    modelVersions: z.record(z.string(), z.string()),
    scorerVersions: z.record(z.string(), z.string()),
    taskResults: z.array(z.unknown()), // EvalTaskResult[] validated on read
    summary: EvalRunSummarySchema.nullable(),
    failureReason: z.string().nullable(),
  })
  .strict();

export type EvalRun = z.infer<typeof EvalRunSchema>;

export function emptyEvalRun(input: {
  id: string;
  suiteId: string;
  suiteVersion: string;
  baselineId: string | null;
  modelVersions: Record<string, string>;
  scorerVersions: Record<string, string>;
}): EvalRun {
  return {
    id: input.id,
    suiteId: input.suiteId,
    suiteVersion: input.suiteVersion,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    baselineId: input.baselineId,
    modelVersions: input.modelVersions,
    scorerVersions: input.scorerVersions,
    taskResults: [],
    summary: null,
    failureReason: null,
  };
}

export function summarize(taskResults: EvalTaskResult[], baseline: EvalRun | null): EvalRunSummary {
  if (taskResults.length === 0) {
    return {
      suiteId: "",
      suiteVersion: "",
      passRate: 0,
      meanScore: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      totalCostUsd: 0,
      regressionDeltaPct: null,
    };
  }
  const passRate = taskResults.filter((r) => r.passed).length / taskResults.length;
  const meanScore = taskResults.reduce((acc, r) => acc + r.score, 0) / taskResults.length;
  const sortedLatencies = taskResults.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] ?? 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] ?? 0;
  const totalCost = taskResults.reduce((acc, r) => acc + r.estimatedCostUsd, 0);
  const baselinePassRate = baseline?.summary?.passRate ?? null;
  const regressionDelta =
    baselinePassRate === null ? null : (passRate - baselinePassRate) * 100;
  return {
    suiteId: taskResults[0]?.taskId ? "" : "",
    suiteVersion: "",
    passRate,
    meanScore,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    totalCostUsd: totalCost,
    regressionDeltaPct: regressionDelta,
  };
}
