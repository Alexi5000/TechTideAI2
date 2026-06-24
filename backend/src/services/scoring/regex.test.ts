import { describe, expect, it } from "vitest";

import { RegexScorer } from "./regex.js";
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

describe("RegexScorer", () => {
  it("passes when output matches", async () => {
    const scorer = new RegexScorer();
    const result = await scorer.score(ctx({ regex: "\\$3M|seed" }, "We raised $3M in a seed round."));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails when output does not match", async () => {
    const scorer = new RegexScorer();
    const result = await scorer.score(ctx({ regex: "^TODO" }, "Completed the migration."));
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it("handles invalid regex gracefully", async () => {
    const scorer = new RegexScorer();
    const result = await scorer.score(ctx({ regex: "[unbalanced" }, "anything"));
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/invalid regex/);
  });

  it("is a no-op when no expected.regex is provided", async () => {
    const scorer = new RegexScorer();
    const result = await scorer.score(ctx({}, "anything"));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("matches against JSON-stringified output for object outputs", async () => {
    const scorer = new RegexScorer();
    const result = await scorer.score(
      ctx({ regex: "\"score\":\\s*0\\.\\d+" },
      { score: 0.85, rationale: "looks good" }),
    );
    expect(result.passed).toBe(true);
  });
});
