import { describe, expect, it } from "vitest";

import { ExactMatchScorer } from "./exact-match.js";
import type { EvalTask } from "../../domain/entities/eval-task.js";
import type { ScorerContext } from "./interfaces.js";

const task: EvalTask = {
  id: "test-task",
  agentId: "test-agent",
  tier: "worker",
  category: "format-compliance",
  difficulty: 1,
  input: {},
  expected: {},
  rubric: "test rubric",
  tags: [],
  timeoutMs: 30_000,
};

function ctx(expected: EvalTask["expected"], agentOutput: unknown): ScorerContext {
  return { task: { ...task, expected }, expected, agentOutput };
}

describe("ExactMatchScorer", () => {
  it("passes when output matches expected exactly", async () => {
    const scorer = new ExactMatchScorer();
    const result = await scorer.score(ctx({ exact: { a: 1, b: 2 } }, { a: 1, b: 2 }));
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });

  it("fails when output differs", async () => {
    const scorer = new ExactMatchScorer();
    const result = await scorer.score(ctx({ exact: { a: 1 } }, { a: 2 }));
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.rationale).toContain("expected");
    expect(result.rationale).toContain("got");
  });

  it("treats undefined keys as null for normalization", async () => {
    const scorer = new ExactMatchScorer();
    const result = await scorer.score(ctx({ exact: { a: null } }, { a: undefined }));
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });

  it("is a no-op when no expected.exact is provided", async () => {
    const scorer = new ExactMatchScorer();
    const result = await scorer.score(ctx({}, { anything: true }));
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });
});
