import { describe, expect, it } from "vitest";

import {
  DEFAULT_AXIS_THRESHOLDS,
  FourAxisGrader,
  type FourAxis,
} from "./four-axis-grader.js";
import type { ScorerContext } from "./interfaces.js";
import type { EvalTask } from "../../domain/entities/eval-task.js";

const task: EvalTask = {
  id: "t",
  agentId: "ceo",
  tier: "ceo",
  category: "multi-step",
  difficulty: 2,
  input: {},
  expected: { rubric: "ok" },
  rubric: "ok",
  tags: [],
  timeoutMs: 5000,
};

function ctxWithAxes(
  axes: Record<FourAxis, number>,
  history?: { score: number; iteration: number; meta?: Record<string, unknown> }[],
): ScorerContext {
  const last = history?.[history.length - 1];
  return {
    task,
    expected: task.expected,
    agentOutput: {},
    history: history
      ? history.map((h) => ({
          score: h.score,
          iteration: h.iteration,
          ...(h.meta ? { meta: h.meta } : {}),
        }))
      : [
          {
            score: 0.9,
            iteration: 1,
            meta: { axes },
          },
        ],
    ...(last ? {} : {}),
  };
}

describe("FourAxisGrader (Phase 8.3)", () => {
  it("passes when all axes are above their thresholds", async () => {
    const grader = new FourAxisGrader();
    const result = await grader.score(
      ctxWithAxes({ correctness: 0.9, safety: 0.95, completeness: 0.85, quality: 0.8 }),
    );
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.85);
  });

  it("fails when any single axis is below its threshold", async () => {
    const grader = new FourAxisGrader();
    const result = await grader.score(
      ctxWithAxes({ correctness: 0.9, safety: 0.95, completeness: 0.6, quality: 0.9 }),
    );
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/completeness/);
  });

  it("weighted headline score matches the documented weights", async () => {
    const grader = new FourAxisGrader();
    const axes = { correctness: 0.5, safety: 1.0, completeness: 1.0, quality: 1.0 };
    const result = await grader.score(ctxWithAxes(axes));
    // 0.5 * 0.4 + 1.0 * 0.2 + 1.0 * 0.2 + 1.0 * 0.2 = 0.2 + 0.6 = 0.8
    // (correctness < its threshold so `passed` is false, but the score is 0.8)
    expect(result.score).toBeCloseTo(0.8, 5);
    expect(result.passed).toBe(false);
  });

  it("returns score=0, passed=false, with a clear error when axes are missing", async () => {
    const grader = new FourAxisGrader();
    const result = await grader.score({
      task,
      expected: task.expected,
      agentOutput: {},
      history: [{ score: 0.5, iteration: 1, meta: { notAxes: true } }],
    });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.rationale).toMatch(/extract axis scores/);
  });

  it("uses custom thresholds when provided", async () => {
    const grader = new FourAxisGrader({ axisThresholds: { safety: 0.99 } });
    const result = await grader.score(
      ctxWithAxes({ correctness: 1.0, safety: 0.95, completeness: 1.0, quality: 1.0 }),
    );
    // safety 0.95 < custom 0.99 → fail
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/safety/);
    expect(DEFAULT_AXIS_THRESHOLDS.safety).toBe(0.9); // default unchanged
  });
});
