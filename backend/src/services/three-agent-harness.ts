/**
 * Three-Agent Harness (Phase 8.4).
 *
 * Implements the Planner → Generator → Evaluator loop with adversarial
 * feedback. Per iteration:
 *
 *   1. The Generator (`contract.generatorAgentId`) runs with the contract's
 *      `prompt` plus the previous Evaluator's rationale (if any) as feedback.
 *   2. The Evaluator (`contract.evaluatorAgentId`) scores the Generator's
 *      output using the contract's `scorers`, including a `four-axis-grader`
 *      that aggregates the four canonical axes.
 *   3. A `plateau-scorer` wrapper records whether the running score has
 *      stagnated within `plateauWindow` × `plateauTolerance`.
 *
 * Stop conditions:
 *   - Generator output passes the headline threshold → `succeeded`
 *   - Score stagnates within the plateau window → `plateau`
 *   - Iteration cap reached → `max-iterations`
 *   - Generator or Evaluator error on every iteration → `errored`
 *
 * The harness is *evaluator-correctness > generator-cleverness*. A plateau is
 * not a failure; it's a signal that more iteration won't help. ADR 0006.
 */

import type { IAgentRuntime, AgentRunRequest, AgentRunResult } from "@techtide/agents";
import { env } from "../config/env.js";
import { traceService, withSpan } from "./trace-service.js";
import {
  defaultScorerRegistry,
  type Scorer,
} from "./scoring/index.js";
import type { ScorerRegistry } from "../domain/policies/scorer-policy.js";
import { toBreakdown, type ScorerContext, type ScoringResult } from "./scoring/interfaces.js";
import { computePlateau } from "./scoring/plateau-scorer.js";
import {
  type SprintContract,
  type SprintResult,
  type SprintIteration,
  emptySprintResult,
} from "../domain/index.js";
import { newSprintRunId, deriveSprintStatusFromIterations } from "../repositories/sprint-repository.js";

export interface ThreeAgentHarnessDeps {
  agentRuntime: IAgentRuntime;
  scorerRegistry?: ScorerRegistry<Scorer>;
  costPer1kTokensUsd?: number;
  /** Concurrent iterations. Default 1. */
  concurrency?: number;
}

export interface RunSprintOptions {
  contract: SprintContract;
  runId?: string;
}

const DEFAULT_COST_PER_1K_TOKENS_USD = 0.005;

interface IterationScorer {
  kind: string;
  weight: number;
  result: ScoringResult;
}

interface IterationTrace {
  iteration: number;
  generatorOutput: unknown;
  /** Rolling history up to and including this iteration. */
  history: { score: number; iteration: number }[];
  /** Per-scorer breakdown for the Evaluator on this iteration. */
  scoringResults: IterationScorer[];
  /** Plateau verdict (sourced from the plateau-scorer's meta). */
  plateauDetected: boolean;
  rollingDelta: number;
  bestSoFar: number;
  iterationLatencyMs: number;
  iterationTokensUsed: number;
  /** The headline score for this iteration. */
  score: number;
  passed: boolean;
}

export class ThreeAgentHarness {
  private readonly runtime: IAgentRuntime;
  private readonly scorers: ScorerRegistry<Scorer>;
  private readonly costPer1k: number;
  private readonly concurrency: number;

  constructor(deps: ThreeAgentHarnessDeps) {
    this.runtime = deps.agentRuntime;
    this.scorers = deps.scorerRegistry ?? defaultScorerRegistry();
    this.costPer1k = deps.costPer1kTokensUsd ?? DEFAULT_COST_PER_1K_TOKENS_USD;
    this.concurrency = Math.max(1, deps.concurrency ?? 1);
  }

  async runSprint(options: RunSprintOptions): Promise<SprintResult> {
    const { contract } = options;
    const runId = options.runId ?? newSprintRunId();
    const startedAt = new Date().toISOString();

    return withSpan("three-agent-harness.runSprint", async (rootSpan) => {
      rootSpan.setAttribute("sprint.contractId", contract.id);
      rootSpan.setAttribute("sprint.contractVersion", contract.contractVersion);
      rootSpan.setAttribute("sprint.maxIterations", contract.maxIterations);

      const trace: IterationTrace[] = [];
      let bestSoFar = 0;
      let bestIteration: number | null = null;
      let totalTokens = 0;
      let totalCost = 0;
      let lastFeedback: string | null = null;
      let hardError = false;

      try {
        for (let i = 0; i < contract.maxIterations; i += 1) {
          const iterTrace = await this.runIteration({
            contract,
            iteration: i,
            history: trace.map((t) => ({ score: t.score, iteration: t.iteration })),
            lastFeedback,
          });
          trace.push(iterTrace);
          totalTokens += iterTrace.iterationTokensUsed;
          totalCost += (iterTrace.iterationTokensUsed / 1000) * this.costPer1k;

          if (iterTrace.score > bestSoFar) {
            bestSoFar = iterTrace.score;
            bestIteration = i;
          }

          if (iterTrace.passed) {
            return this.finalize({
              runId,
              contract,
              trace,
              startedAt,
              totalTokens,
              totalCost,
              bestSoFar,
              bestIteration,
              statusOverride: "succeeded",
            });
          }
          if (iterTrace.plateauDetected) {
            return this.finalize({
              runId,
              contract,
              trace,
              startedAt,
              totalTokens,
              totalCost,
              bestSoFar,
              bestIteration,
              statusOverride: "plateau",
            });
          }
          // Build feedback for the next iteration from the most recent scorers' rationales.
          lastFeedback = iterTrace.scoringResults
            .filter((r) => !r.result.passed)
            .map((r) => `[${r.kind}] ${r.result.rationale}`)
            .join("\n") || null;
        }

        return this.finalize({
          runId,
          contract,
          trace,
          startedAt,
          totalTokens,
          totalCost,
          bestSoFar,
          bestIteration,
          statusOverride: "max-iterations",
        });
      } catch (err) {
        hardError = true;
        return this.finalize({
          runId,
          contract,
          trace,
          startedAt,
          totalTokens,
          totalCost,
          bestSoFar,
          bestIteration,
          statusOverride: "errored",
          failureReason: (err as Error).message,
        });
      } finally {
        if (hardError) {
          // no-op; finalize already ran in catch.
        }
      }
    });
  }

  private async runIteration(input: {
    contract: SprintContract;
    iteration: number;
    history: { score: number; iteration: number; meta?: Record<string, unknown> }[];
    lastFeedback: string | null;
  }): Promise<IterationTrace> {
    const start = Date.now();

    // Step 1: Generator
    const generatorOutput = await withSpan(
      "sprint.generator",
      async (span) => {
        span.setAttribute("sprint.iteration", input.iteration);
        span.setAttribute("agent.id", input.contract.generatorAgentId);
        const request: AgentRunRequest = {
          agentId: input.contract.generatorAgentId,
          input: {
            prompt: input.contract.prompt,
            ...(input.lastFeedback ? { feedback: input.lastFeedback } : {}),
            iteration: input.iteration,
          },
        };
        return this.runAgent(request);
      },
    );

    // Step 2: Evaluator
    const evaluatorOutput = await withSpan(
      "sprint.evaluator",
      async (span) => {
        span.setAttribute("sprint.iteration", input.iteration);
        span.setAttribute("agent.id", input.contract.evaluatorAgentId);
        const request: AgentRunRequest = {
          agentId: input.contract.evaluatorAgentId,
          input: {
            prompt: input.contract.prompt,
            candidate: generatorOutput,
            acceptanceCriteria: input.contract.acceptanceCriteria,
            iteration: input.iteration,
          },
        };
        return this.runAgent(request);
      },
    );

    // Step 3: Scorers, run every scorer in the contract against the generator's
    // output, with the evaluator's `axes` meta published to the four-axis grader
    // and the rolling history published to the plateau scorer.
    const scoringResults: IterationScorer[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let passed = true;
    for (const spec of input.contract.scorers) {
      const entry = this.scorers.has(spec.kind)
        ? this.scorers.get(spec.kind)
        : null;
      if (!entry) {
        scoringResults.push({
          kind: spec.kind,
          weight: spec.weight,
          result: {
            score: 0,
            passed: false,
            rationale: `scorer kind not registered: ${spec.kind}`,
            durationMs: 0,
          },
        });
        totalWeight += spec.weight;
        passed = false;
        continue;
      }
      const scorer = entry.factory();
      const context: ScorerContext = {
        task: {
          id: `${input.contract.id}-iter-${input.iteration}`,
          agentId: input.contract.generatorAgentId,
          tier: "orchestrator",
          category: "multi-step",
          difficulty: 3,
          input: { prompt: input.contract.prompt },
          expected: {
            rubric: input.contract.rubric,
            assertions: input.contract.acceptanceCriteria,
          },
          rubric: input.contract.rubric,
          tags: ["sprint"],
          timeoutMs: 60_000,
        },
        expected: {
          rubric: input.contract.rubric,
          assertions: input.contract.acceptanceCriteria,
        },
        agentOutput: generatorOutput,
        judgeModel: env.EVAL_DEFAULT_JUDGE_MODEL,
        history: input.history,
        // The four-axis grader reads the inner scorer's `meta.axes`; we set it here
        // so the grader has something to score against without a second LLM call.
        ...(scorer.kind === "four-axis-grader" && typeof evaluatorOutput === "object" && evaluatorOutput !== null
          ? {
              history: [
                ...input.history,
                {
                  score: 0,
                  iteration: input.iteration,
                  meta: ((evaluatorOutput as Record<string, unknown>)["meta"] ?? evaluatorOutput) as Record<string, unknown>,
                },
              ],
            }
          : {}),
      };
      try {
        const result = await scorer.score(context);
        scoringResults.push({ kind: spec.kind, weight: spec.weight, result });
        weightedSum += result.score * spec.weight;
        totalWeight += spec.weight;
        if (!result.passed) passed = false;
      } catch (err) {
        scoringResults.push({
          kind: spec.kind,
          weight: spec.weight,
          result: {
            score: 0,
            passed: false,
            rationale: `scorer ${scorer.kind} threw: ${(err as Error).message}`,
            durationMs: 0,
          },
        });
        totalWeight += spec.weight;
        passed = false;
      }
    }

    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const verdict = computePlateau(
      [...input.history, { score, iteration: input.iteration }],
      input.contract.plateauWindow,
      input.contract.plateauTolerance,
    );

    const tokensUsed = estimateTokens(generatorOutput) + estimateTokens(evaluatorOutput);

    return {
      iteration: input.iteration,
      generatorOutput,
      history: [...input.history, { score, iteration: input.iteration }],
      scoringResults,
      plateauDetected: verdict.plateauDetected,
      rollingDelta: verdict.rollingDelta,
      bestSoFar: verdict.bestSoFar,
      iterationLatencyMs: Date.now() - start,
      iterationTokensUsed: tokensUsed,
      score,
      passed,
    };
  }

  private async runAgent(request: AgentRunRequest): Promise<unknown> {
    try {
      const result: AgentRunResult = await this.runtime.execute(request);
      return result.success ? result.output : { error: result.error ?? "agent returned success=false" };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  private finalize(input: {
    runId: string;
    contract: SprintContract;
    trace: IterationTrace[];
    startedAt: string;
    totalTokens: number;
    totalCost: number;
    bestSoFar: number;
    bestIteration: number | null;
    statusOverride: SprintResult["status"];
    failureReason?: string;
  }): SprintResult {
    const completedAt = new Date().toISOString();
    const iterations: SprintIteration[] = input.trace.map((t) => ({
      iteration: t.iteration,
      agentOutput: t.generatorOutput,
      taskResult: {
        taskId: `${input.contract.id}-iter-${t.iteration}`,
        agentId: input.contract.generatorAgentId,
        agentOutput: t.generatorOutput,
        score: t.score,
        passed: t.passed,
        latencyMs: t.iterationLatencyMs,
        tokensUsed: t.iterationTokensUsed,
        estimatedCostUsd: (t.iterationTokensUsed / 1000) * this.costPer1k,
        scorers: t.scoringResults.map((r) => toBreakdown(
          { kind: r.kind as Scorer["kind"] } as Scorer,
          r.result,
          r.weight,
        )),
        failureReason: t.passed
          ? null
          : t.scoringResults
              .filter((r) => !r.result.passed)
              .map((r) => `[${r.kind}] ${r.result.rationale}`)
              .join(" | "),
        observedAt: completedAt,
      },
      plateauDetected: t.plateauDetected,
      rollingDelta: t.rollingDelta,
    }));

    const status =
      input.statusOverride === "succeeded" || input.statusOverride === "plateau" || input.statusOverride === "max-iterations"
        ? input.statusOverride
        : deriveSprintStatusFromIterations(
            iterations.map((it) => ({ taskResult: it.taskResult })),
            iterations[iterations.length - 1]?.plateauDetected ?? false,
            iterations.length >= input.contract.maxIterations,
          );

    return {
      ...emptySprintResult({
        id: input.runId,
        contractId: input.contract.id,
        contractVersion: input.contract.contractVersion,
        startedAt: input.startedAt,
      }),
      status,
      completedAt,
      iterations,
      bestIteration: input.bestIteration,
      bestScore: input.bestSoFar,
      totalTokens: input.totalTokens,
      totalCostUsd: input.totalCost,
      failureReason: input.failureReason ?? null,
    };
  }
}

function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : safeStringify(value);
  return Math.ceil(text.length / 4);
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export { traceService };
