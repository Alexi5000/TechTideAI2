import { describe, expect, it } from "vitest";

import { JsonSchemaScorer } from "./json-schema.js";
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

describe("JsonSchemaScorer", () => {
  it("passes a well-formed object", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = {
      type: "object",
      required: ["a", "b"],
      properties: { a: { type: "string" }, b: { type: "number" } },
    };
    const result = await scorer.score(ctx({ jsonSchema: schema }, { a: "hi", b: 3 }));
    expect(result.passed).toBe(true);
  });

  it("flags missing required keys", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = {
      type: "object",
      required: ["a", "b"],
      properties: { a: { type: "string" }, b: { type: "number" } },
    };
    const result = await scorer.score(ctx({ jsonSchema: schema }, { a: "hi" }));
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/\.b.*required/);
  });

  it("flags wrong primitive types", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = { type: "object", properties: { a: { type: "number" } } };
    const result = await scorer.score(ctx({ jsonSchema: schema }, { a: "not a number" }));
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/expected number/);
  });

  it("validates enum values", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = { type: "string", enum: ["high", "low"] };
    const result = await scorer.score(ctx({ jsonSchema: schema }, "medium"));
    expect(result.passed).toBe(false);
  });

  it("validates array items", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = {
      type: "object",
      required: ["stack"],
      properties: {
        stack: { type: "array", items: { type: "string" } },
      },
    };
    const result = await scorer.score(
      ctx({ jsonSchema: schema }, { stack: ["a", "b", 3] }),
    );
    expect(result.passed).toBe(false);
    expect(result.rationale).toMatch(/stack\[2\].*expected string/);
  });

  it("validates string patterns", async () => {
    const scorer = new JsonSchemaScorer();
    const schema = { type: "string", pattern: "^TODO-\\d+$" };
    const result = await scorer.score(ctx({ jsonSchema: schema }, "TODO-abc"));
    expect(result.passed).toBe(false);
  });

  it("is a no-op when no expected.jsonSchema is provided", async () => {
    const scorer = new JsonSchemaScorer();
    const result = await scorer.score(ctx({}, { anything: true }));
    expect(result.passed).toBe(true);
  });
});
