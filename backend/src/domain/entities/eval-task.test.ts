import { describe, expect, it } from "vitest";

import { parseEvalTask, EvalTaskSchema } from "./eval-task.js";

const validTask = {
  id: "t1",
  agentId: "ceo",
  tier: "ceo",
  category: "format-compliance",
  difficulty: 1,
  input: {},
  expected: {},
  rubric: "rubric text",
  tags: [],
  timeoutMs: 5000,
};

describe("EvalTaskSchema", () => {
  it("accepts a minimal valid task", () => {
    const parsed = parseEvalTask(validTask);
    expect(parsed.id).toBe("t1");
    expect(parsed.timeoutMs).toBe(5000);
  });

  it("rejects unknown category", () => {
    expect(() => parseEvalTask({ ...validTask, category: "garbage" })).toThrow();
  });

  it("rejects difficulty outside 1..3", () => {
    expect(() => parseEvalTask({ ...validTask, difficulty: 4 })).toThrow();
  });

  it("rejects timeout below 1000ms", () => {
    expect(() => parseEvalTask({ ...validTask, timeoutMs: 100 })).toThrow();
  });

  it("rejects empty rubric", () => {
    expect(() => parseEvalTask({ ...validTask, rubric: "" })).toThrow();
  });

  it("accepts all valid category values", () => {
    const cats = ["format-compliance", "domain-reasoning", "tool-use", "memory-recall", "multi-step"];
    for (const c of cats) {
      expect(() => parseEvalTask({ ...validTask, category: c })).not.toThrow();
    }
  });

  it("schema is exported and usable standalone", () => {
    const parsed = EvalTaskSchema.parse(validTask);
    expect(parsed.tags).toEqual([]);
  });
});
