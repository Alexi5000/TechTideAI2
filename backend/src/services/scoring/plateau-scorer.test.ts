import { describe, expect, it } from "vitest";

import { computePlateau, PlateauScorer } from "./plateau-scorer.js";
import { ExactMatchScorer } from "./exact-match.js";
import type { ScorerContext } from "./interfaces.js";
import type { EvalTask } from "../../domain/entities/eval-task.js";

const task: EvalTask = {
  id: "t",
  agentId: "ceo",
  tier: "ceo",
  category: "multi-step",
  difficulty: 1,
  input: {},
  expected: { rubric: "ok" },
  rubric: "ok",
  tags: [],
  timeoutMs: 5000,
};

function ctxWithHistory(history: { score: number; iteration: number }[]): ScorerContext {
  return { task, expected: task.expected, agentOutput: {}, history };
}

describe("computePlateau (Phase 8.5)", () => {
  it("returns no plateau with fewer than 2 samples", () => {
    expect(computePlateau([], 2, 0.02).plateauDetected).toBe(false);
    expect(computePlateau([{ score: 0.5, iteration: 1 }], 2, 0.02).plateauDetected).toBe(false);
  });

  it("monotonic improvement does not plateau", () => {
    const v = computePlateau(
      [
        { score: 0.5, iteration: 1 },
        { score: 0.6, iteration: 2 },
        { score: 0.7, iteration: 3 },
        { score: 0.8, iteration: 4 },
      ],
      2,
      0.02,
    );
    expect(v.plateauDetected).toBe(false);
    expect(v.rollingDelta).toBeCloseTo(0.2, 5);
  });

  it("one-step regression does not plateau (delta > tolerance)", () => {
    const v = computePlateau(
      [
        { score: 0.7, iteration: 1 },
        { score: 0.5, iteration: 2 },
      ],
      2,
      0.02,
    );
    expect(v.plateauDetected).toBe(false);
  });

  it("stagnation within tolerance is a plateau", () => {
    const v = computePlateau(
      [
        { score: 0.80, iteration: 1 },
        { score: 0.81, iteration: 2 },
        { score: 0.80, iteration: 3 },
      ],
      2,
      0.02,
    );
    expect(v.plateauDetected).toBe(true);
    expect(v.bestSoFar).toBeCloseTo(0.81, 5);
    expect(v.latestScore).toBeCloseTo(0.80, 5);
  });

  it("strictly-better late score overrides a stagnant window", () => {
    const v = computePlateau(
      [
        { score: 0.80, iteration: 1 },
        { score: 0.80, iteration: 2 },
        { score: 0.85, iteration: 3 },
      ],
      2,
      0.02,
    );
    expect(v.plateauDetected).toBe(false);
  });
});

describe("PlateauScorer (Phase 8.5)", () => {
  it("wraps an inner scorer and publishes plateau meta", async () => {
    const inner = new ExactMatchScorer();
    const scorer = new PlateauScorer({ inner });
    const result = await scorer.score(ctxWithHistory([
      { score: 0.80, iteration: 1 },
      { score: 0.80, iteration: 2 },
    ]));
    expect(result.passed).toBe(true);
    expect(result.meta).toBeDefined();
    const meta = result.meta as { plateauDetected: boolean; rollingDelta: number; windowSize: number; tolerance: number };
    expect(meta.plateauDetected).toBe(true);
    expect(meta.rollingDelta).toBeCloseTo(0, 5);
    expect(meta.windowSize).toBe(2);
  });

  it("preserves the inner scorer's pass/fail verdict", async () => {
    const inner = new ExactMatchScorer();
    const scorer = new PlateauScorer({ inner });
    const result = await scorer.score({
      task,
      expected: { exact: { ok: true } },
      agentOutput: { ok: false },
      history: [{ score: 0.5, iteration: 1 }],
    });
    expect(result.passed).toBe(false);
  });
});
