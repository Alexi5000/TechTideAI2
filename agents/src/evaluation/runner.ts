/**
 * Evaluation Runner
 *
 * Executes evaluation datasets against agents via the IAgentRuntime interface.
 * Applies scorers to results and aggregates into reports.
 */

import type { IAgentRuntime } from "../runtime/types.js";
import type { EvalCase, EvalDataset, EvalResult, EvalReport, EvalRunnerOptions, Scorer } from "./types.js";

export class EvalRunner {
  constructor(
    private readonly runtime: IAgentRuntime,
    private readonly options: EvalRunnerOptions = {},
  ) {}

  /**
   * Run a single evaluation case against the runtime.
   */
  async runCase(evalCase: EvalCase, scorers: Scorer[]): Promise<EvalResult> {
    const start = Date.now();

    try {
      const result = await this.runtime.execute({
        agentId: evalCase.agentId,
        input: evalCase.input,
      });

      const durationMs = Date.now() - start;

      const scores: Record<string, number> = {};
      for (const scorer of scorers) {
        scores[scorer.id] = scorer.score(result, evalCase);
      }

      // Override latency score with actual duration-based scoring
      if (scores["latency"] !== undefined) {
        scores["latency"] = Math.max(0, 1 - durationMs / 30_000);
      }

      return {
        caseId: evalCase.id,
        agentId: evalCase.agentId,
        output: result.output,
        scores,
        durationMs,
        error: result.success ? undefined : result.error,
      };
    } catch (error) {
      const durationMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const scores: Record<string, number> = {};
      for (const scorer of scorers) {
        scores[scorer.id] = 0;
      }

      return {
        caseId: evalCase.id,
        agentId: evalCase.agentId,
        output: {},
        scores,
        durationMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Run all cases in a dataset and produce an aggregated report.
   */
  async runDataset(dataset: EvalDataset, scorers: Scorer[]): Promise<EvalReport> {
    const concurrency = this.options.concurrency ?? 1;
    const results: EvalResult[] = [];

    if (concurrency <= 1) {
      for (const evalCase of dataset.cases) {
        results.push(await this.runCase(evalCase, scorers));
      }
    } else {
      // Run cases in batches
      for (let i = 0; i < dataset.cases.length; i += concurrency) {
        const batch = dataset.cases.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map((evalCase) => this.runCase(evalCase, scorers)),
        );
        results.push(...batchResults);
      }
    }

    return this.buildReport(dataset.id, results, scorers);
  }

  private buildReport(datasetId: string, results: EvalResult[], scorers: Scorer[]): EvalReport {
    const totalCases = results.length;
    const failed = results.filter((r) => r.error !== undefined).length;
    const passed = totalCases - failed;

    const averageScores: Record<string, number> = {};
    for (const scorer of scorers) {
      const values = results.map((r) => r.scores[scorer.id] ?? 0);
      averageScores[scorer.id] =
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);
    const averageDurationMs = totalCases > 0 ? totalDuration / totalCases : 0;

    return {
      datasetId,
      results,
      summary: {
        totalCases,
        passed,
        failed,
        averageScores,
        averageDurationMs,
      },
    };
  }
}
