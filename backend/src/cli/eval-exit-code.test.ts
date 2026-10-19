import { describe, expect, it } from "vitest";

import {
  EXIT_OK,
  EXIT_REGRESSION,
  EXIT_RUN_FAILED,
  resolveEvalExit,
} from "./eval-exit-code.js";
import type { EvalRun } from "../domain/entities/eval-run.js";

function run(overrides: Partial<EvalRun>): Pick<EvalRun, "status" | "summary" | "taskResults"> {
  return {
    status: "succeeded",
    taskResults: [{ taskId: "t1", passed: true, failureReason: null }],
    summary: {
      suiteId: "s",
      suiteVersion: "v1",
      passRate: 1,
      meanScore: 1,
      p50LatencyMs: 1,
      p95LatencyMs: 1,
      totalCostUsd: 0,
      regressionDeltaPct: null,
    },
    ...overrides,
  };
}

describe("resolveEvalExit", () => {
  it("exits 0 for a succeeded run without baseline", () => {
    expect(resolveEvalExit(run({}))).toEqual({ code: EXIT_OK, message: null });
  });

  // Regression: CI reported green on 2026-09-28..10-01 although every task
  // failed with "Could not find API key process.env.OPENAI_API_KEY".
  it("exits non-zero when the run failed and there is no baseline", () => {
    const failed = run({
      status: "failed",
      taskResults: [
        { taskId: "a", passed: false, failureReason: "Could not find API key process.env.OPENAI_API_KEY" },
        { taskId: "b", passed: false, failureReason: "Could not find API key process.env.OPENAI_API_KEY" },
      ],
    });
    const decision = resolveEvalExit(failed);
    expect(decision.code).toBe(EXIT_RUN_FAILED);
    expect(decision.message).toContain("2/2 tasks errored");
  });

  it("exits 3 on regression beyond threshold", () => {
    const r = run({});
    r.summary = { ...r.summary!, regressionDeltaPct: -10 };
    expect(resolveEvalExit(r).code).toBe(EXIT_REGRESSION);
  });

  it("tolerates small drops within threshold", () => {
    const r = run({});
    r.summary = { ...r.summary!, regressionDeltaPct: -4 };
    expect(resolveEvalExit(r).code).toBe(EXIT_OK);
  });
  it.each(["running", "canceled", "failed"] as const)("fails closed for %s runs", (status) => {
    expect(resolveEvalExit(run({ status, taskResults: [null, {}] })).code).toBe(EXIT_RUN_FAILED);
  });

});
