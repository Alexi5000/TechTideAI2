/**
 * Eval Harness - Application Layer
 *
 * Runs an `EvalSuite` against the live `IAgentRuntime`, captures per-task output,
 * routes it through every registered scorer, and produces an `EvalRun` with a
 * summary suitable for `docs/EVALS/latest.json`.
 *
 * Design notes:
 * - This service is **synchronous** by default; tasks run sequentially so output
 *   is deterministic for replay. Parallel mode is available via `concurrency`
 *   for nightly CI.
 * - The harness never writes to the run-service — it owns its own persistence
 *   surface (`eval-run-repository.ts`) so eval runs can't accidentally pollute
 *   the production run stream.
 * - Cost estimation is conservative: $0.005 per 1k tokens for OpenAI-class models.
 *   Replace with `LlmResponse.usage` once the provider adapters surface it.
 *
 * Scorer selection (Phase 8 pre-req C): the suite is the source of which scorers
 * apply and at what weight. The scorer registry is the source of scorer
 * implementations. The harness captures the active suite for the duration of
 * `runSuite` and reads scorer specs from `suite.scorers` filtered through
 * `resolveScorers(suite, task)`. This makes the contract honest: a fixture
 * says exactly which scorers run, in what proportion, with what thresholds.
 */

import type { IAgentRuntime } from "@techtide/agents";
import { getAgentById } from "@techtide/agents";
import { env } from "../config/env.js";
import { EvalRegressionDetectedError, ScorerUnavailableError } from "../domain/index.js";
import { resolveScorers } from "../domain/index.js";
import type { ScorerRegistry } from "../domain/policies/scorer-policy.js";
import { defaultScorerRegistry } from "./scoring/index.js";
import type { Scorer } from "./scoring/interfaces.js";
import { toBreakdown } from "./scoring/interfaces.js";
import type { EvalSuite, ScorerSpec } from "../domain/entities/eval-suite.js";
import type { EvalTask } from "../domain/entities/eval-task.js";
import type {
  EvalRun,
  EvalRunSummary,
} from "../domain/entities/eval-run.js";
import {
  emptyEvalRun,
  summarize,
} from "../domain/entities/eval-run.js";
import type { EvalTaskResult } from "../domain/entities/eval-result.js";

export interface EvalHarnessDeps {
  agentRuntime: IAgentRuntime;
  scorerRegistry?: ScorerRegistry<Scorer>;
  /** Approximate cost per 1k tokens (input+output combined). */
  costPer1kTokensUsd?: number;
  /** Concurrency for task execution. 1 = deterministic replay. */
  concurrency?: number;
}

export interface RunSuiteOptions {
  suite: EvalSuite;
  baseline?: EvalRun | undefined;
  runId?: string;
  judgeModel?: string;
}

const DEFAULT_COST_PER_1K_TOKENS_USD = 0.005;

export class EvalHarness {
  private readonly runtime: IAgentRuntime;
  private readonly scorers: ScorerRegistry<Scorer>;
  private readonly costPer1k: number;
  private readonly concurrency: number;
  /** The suite being executed right now. Set in runSuite, read in runTask. */
  private activeSuite: EvalSuite | null = null;

  constructor(deps: EvalHarnessDeps) {
    this.runtime = deps.agentRuntime;
    this.scorers = deps.scorerRegistry ?? defaultScorerRegistry();
    this.costPer1k = deps.costPer1kTokensUsd ?? DEFAULT_COST_PER_1K_TOKENS_USD;
    this.concurrency = Math.max(1, deps.concurrency ?? 1);
  }

  async runSuite(options: RunSuiteOptions): Promise<EvalRun> {
    const { suite, baseline } = options;
    const runId = options.runId ?? newRunId();
    const judgeModel = options.judgeModel ?? "gpt-4o";

    this.activeSuite = suite;

    try {
      const run = emptyEvalRun({
        id: runId,
        suiteId: suite.id,
        suiteVersion: suite.version,
        baselineId: baseline?.id ?? null,
        modelVersions: detectModelVersions(),
        scorerVersions: this.scorers.versions(),
      });

      const results = await this.runTasks(suite.tasks, judgeModel);
      const summary = summarize(results, baseline ?? null);
      const completed: EvalRun = {
        ...run,
        completedAt: new Date().toISOString(),
        status: results.some((r) => r.failureReason !== null && !r.passed) ? "failed" : "succeeded",
        taskResults: results,
        summary: { ...summary, suiteId: suite.id, suiteVersion: suite.version },
      };

      if (baseline?.summary) {
        const delta = completed.summary!.regressionDeltaPct;
        const threshold = env.EVAL_REGRESSION_THRESHOLD_PCT;
        if (delta !== null && delta < -threshold) {
          throw new EvalRegressionDetectedError(
            baseline.summary.passRate,
            completed.summary!.passRate,
            threshold,
          );
        }
      }

      return completed;
    } finally {
      this.activeSuite = null;
    }
  }

  private async runTasks(
    tasks: readonly EvalTask[],
    judgeModel: string,
  ): Promise<EvalTaskResult[]> {
    if (this.concurrency === 1) {
      const out: EvalTaskResult[] = [];
      for (const task of tasks) {
        out.push(await this.runTask(task, judgeModel));
      }
      return out;
    }
    const queue = [...tasks];
    const out: EvalTaskResult[] = [];
    const workers = Array.from({ length: this.concurrency }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        out.push(await this.runTask(next, judgeModel));
      }
    });
    await Promise.all(workers);
    return out;
  }

  private async runTask(task: EvalTask, judgeModel: string): Promise<EvalTaskResult> {
    const start = Date.now();
    if (!getAgentById(task.agentId)) {
      return this.failResult(task, `agent not found: ${task.agentId}`, Date.now() - start);
    }

    let agentOutput: unknown;
    try {
      const result = await this.runtime.execute({
        agentId: task.agentId,
        input: task.input,
      });
      if (!result.success) {
        return this.failResult(
          task,
          result.error ?? "agent execution returned success=false",
          Date.now() - start,
          result.output,
        );
      }
      agentOutput = result.output;
    } catch (err) {
      return this.failResult(task, (err as Error).message, Date.now() - start);
    }

    const scorers = this.pickScorersFor(task);
    const breakdowns = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let passed = true;
    const latencies: number[] = [];

    for (const { spec, scorer } of scorers) {
      try {
        const scoring = await scorer.score({
          task,
          expected: task.expected,
          agentOutput,
          judgeModel,
        });
        breakdowns.push(toBreakdown(scorer, scoring, spec.weight));
        weightedSum += scoring.score * spec.weight;
        totalWeight += spec.weight;
        if (!scoring.passed) passed = false;
        latencies.push(scoring.durationMs);
      } catch (err) {
        const failureScoring = {
          score: 0,
          passed: false,
          rationale: `scorer ${scorer.kind} threw: ${(err as Error).message}`,
          durationMs: 0,
        };
        breakdowns.push(toBreakdown(scorer, failureScoring, spec.weight));
        totalWeight += spec.weight;
        passed = false;
      }
    }

    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const latencyMs = Date.now() - start;
    const tokensUsed = estimateTokens(agentOutput);
    return {
      taskId: task.id,
      agentId: task.agentId,
      agentOutput,
      score,
      passed,
      latencyMs,
      tokensUsed,
      estimatedCostUsd: (tokensUsed / 1000) * this.costPer1k,
      scorers: breakdowns,
      failureReason: passed ? null : scoreRationale(breakdowns),
      observedAt: new Date().toISOString(),
    };
  }

  private pickScorersFor(task: EvalTask): Array<{ spec: ScorerSpec; scorer: Scorer }> {
    if (!this.activeSuite) {
      throw new Error("pickScorersFor called outside of runSuite — no active suite");
    }
    // The suite is the source of truth for which scorers apply and at what weight.
    // Per-task overrides are reserved for a future fixture format (task.scorerOverrides).
    const activeKinds = new Set(resolveScorers(this.activeSuite, task));
    const out: Array<{ spec: ScorerSpec; scorer: Scorer }> = [];
    for (const spec of this.activeSuite.scorers) {
      if (!activeKinds.has(spec.kind)) continue;
      if (!this.scorers.has(spec.kind)) {
        throw new ScorerUnavailableError(spec.kind);
      }
      out.push({ spec, scorer: this.scorers.get(spec.kind).factory() });
    }
    return out;
  }

  private failResult(
    task: EvalTask,
    reason: string,
    latencyMs: number,
    agentOutput?: unknown,
  ): EvalTaskResult {
    return {
      taskId: task.id,
      agentId: task.agentId,
      agentOutput: agentOutput ?? null,
      score: 0,
      passed: false,
      latencyMs,
      tokensUsed: 0,
      estimatedCostUsd: 0,
      scorers: [],
      failureReason: reason,
      observedAt: new Date().toISOString(),
    };
  }
}

export function detectModelVersions(): Record<string, string> {
  return {
    openai: env.OPENAI_API_KEY ? "gpt-4o" : "unconfigured",
    anthropic: env.ANTHROPIC_API_KEY ? "claude-3-5-sonnet-20241022" : "unconfigured",
    runtime: process.env["npm_package_version"] ?? "0.0.0",
    node: process.version,
  };
}

export function estimateTokens(value: unknown): number {
  // Crude token estimator: ~4 chars per token. Sufficient for cost accounting.
  const text = safeStringifyForEstimate(value);
  return Math.ceil(text.length / 4);
}

function safeStringifyForEstimate(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function scoreRationale(breakdowns: { scorer: string; passed: boolean; rationale: string }[]): string {
  return breakdowns
    .filter((b) => !b.passed)
    .map((b) => `[${b.scorer}] ${b.rationale}`)
    .join(" | ");
}

function newRunId(): string {
  // RFC 4122 v4-ish. Avoids pulling in `crypto.randomUUID` for testability.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function selectRunSuiteOptionsSummary(run: EvalRun): EvalRunSummary {
  if (run.summary) return run.summary;
  return {
    suiteId: run.suiteId,
    suiteVersion: run.suiteVersion,
    passRate: 0,
    meanScore: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    totalCostUsd: 0,
    regressionDeltaPct: null,
  };
}
