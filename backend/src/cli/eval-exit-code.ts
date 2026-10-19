/**
 * Maps a finished EvalRun to the CLI process exit code.
 *
 *   0 = run succeeded and did not regress
 *   3 = pass rate regressed more than the threshold vs baseline
 *   4 = run finished with status "failed" (one or more tasks errored, e.g.
 *       missing provider API key), so CI must not report it as green
 */

import type { EvalRun } from "../domain/entities/eval-run.js";

export const EXIT_OK = 0;
export const EXIT_REGRESSION = 3;
export const EXIT_RUN_FAILED = 4;

export const DEFAULT_REGRESSION_THRESHOLD_PCT = 5;

export interface EvalExitDecision {
  code: number;
  message: string | null;
}

export function resolveEvalExit(
  run: Pick<EvalRun, "status" | "summary" | "taskResults">,
  thresholdPct: number = DEFAULT_REGRESSION_THRESHOLD_PCT,
): EvalExitDecision {
  const delta = run.summary?.regressionDeltaPct;
  if (delta !== null && delta !== undefined && delta < -thresholdPct) {
    return {
      code: EXIT_REGRESSION,
      message: `Regression: pass rate dropped ${(-delta).toFixed(1)}% vs baseline.`,
    };
  }
  if (run.status !== "succeeded") {
    const errored = run.taskResults.filter(
      (r) => typeof r === "object" && r !== null && "failureReason" in r && r.failureReason != null,
    ).length;
    return {
      code: EXIT_RUN_FAILED,
      message: `Eval run status is "${run.status}" (${errored}/${run.taskResults.length} tasks errored).`,
    };
  }
  return { code: EXIT_OK, message: null };
}
