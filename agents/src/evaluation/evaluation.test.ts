import { describe, expect, it, vi } from "vitest";
import { EvalRunner } from "./runner.js";
import { createDataset, validateDataset } from "./dataset.js";
import { exactMatchScorer, containsScorer, jsonSchemaScorer } from "./scorer.js";
import type { IAgentRuntime, AgentRunResult } from "../runtime/types.js";
import type { EvalDataset } from "./types.js";

function createMockRuntime(result: AgentRunResult): IAgentRuntime {
  return {
    execute: vi.fn().mockResolvedValue(result),
  };
}

function createFailingRuntime(error: string): IAgentRuntime {
  return {
    execute: vi.fn().mockRejectedValue(new Error(error)),
  };
}

const successResult: AgentRunResult = {
  success: true,
  output: { text: "Hello world" },
  events: [],
};

const sampleDataset: EvalDataset = {
  id: "test-dataset",
  name: "Test Dataset",
  cases: [
    {
      id: "case-1",
      agentId: "ceo",
      input: { prompt: "test" },
      expectedOutput: { text: "Hello world" },
    },
    {
      id: "case-2",
      agentId: "ceo",
      input: { prompt: "test 2" },
      expectedOutput: { text: "Goodbye" },
    },
  ],
  createdAt: new Date().toISOString(),
};

describe("EvalRunner", () => {
  it("executes a single case and returns a result", async () => {
    const runtime = createMockRuntime(successResult);
    const runner = new EvalRunner(runtime);
    const result = await runner.runCase(sampleDataset.cases[0]!, [exactMatchScorer]);

    expect(result.caseId).toBe("case-1");
    expect(result.agentId).toBe("ceo");
    expect(result.output).toEqual({ text: "Hello world" });
    expect(result.scores["exact-match"]).toBe(1.0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it("aggregates a dataset into a report", async () => {
    const runtime = createMockRuntime(successResult);
    const runner = new EvalRunner(runtime);
    const report = await runner.runDataset(sampleDataset, [exactMatchScorer]);

    expect(report.datasetId).toBe("test-dataset");
    expect(report.results).toHaveLength(2);
    expect(report.summary.totalCases).toBe(2);
    expect(report.summary.passed).toBe(2);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.averageScores["exact-match"]).toBeDefined();
  });

  it("records error in EvalResult on failed agent execution", async () => {
    const runtime = createFailingRuntime("Agent crashed");
    const runner = new EvalRunner(runtime);
    const result = await runner.runCase(sampleDataset.cases[0]!, [exactMatchScorer]);

    expect(result.error).toBe("Agent crashed");
    expect(result.scores["exact-match"]).toBe(0);
    expect(result.output).toEqual({});
  });
});

describe("scorers", () => {
  it("exactMatchScorer scores 1.0 on match, 0.0 on mismatch", () => {
    const matchCase = sampleDataset.cases[0]!;
    const mismatchCase = sampleDataset.cases[1]!;

    expect(exactMatchScorer.score(successResult, matchCase)).toBe(1.0);
    expect(exactMatchScorer.score(successResult, mismatchCase)).toBe(0.0);
  });

  it("containsScorer scores based on substring presence", () => {
    const matchCase = {
      id: "c1",
      agentId: "ceo",
      input: {},
      expectedOutput: { text: "Hello" },
    };
    const mismatchCase = {
      id: "c2",
      agentId: "ceo",
      input: {},
      expectedOutput: { text: "Missing" },
    };

    expect(containsScorer.score(successResult, matchCase)).toBe(1.0);
    expect(containsScorer.score(successResult, mismatchCase)).toBe(0.0);
  });

  it("jsonSchemaScorer validates output structure", () => {
    const matchCase = {
      id: "c1",
      agentId: "ceo",
      input: {},
      expectedOutput: { text: "anything" },
    };
    const mismatchCase = {
      id: "c2",
      agentId: "ceo",
      input: {},
      expectedOutput: { text: "anything", missing_key: "value" },
    };

    expect(jsonSchemaScorer.score(successResult, matchCase)).toBe(1.0);
    expect(jsonSchemaScorer.score(successResult, mismatchCase)).toBe(0.5);
  });
});

describe("dataset utilities", () => {
  it("createDataset generates a valid dataset", () => {
    const ds = createDataset("test", [
      { id: "c1", agentId: "ceo", input: { prompt: "hi" } },
    ]);
    expect(ds.name).toBe("test");
    expect(ds.cases).toHaveLength(1);
    expect(ds.id).toMatch(/^eval-/);
    expect(ds.createdAt).toBeTruthy();
  });

  it("validateDataset throws on invalid input", () => {
    expect(() => validateDataset(null)).toThrow("Dataset must be an object");
    expect(() => validateDataset({ id: "", name: "x", cases: [] })).toThrow("non-empty 'id'");
    expect(() => validateDataset({ id: "x", name: "x", cases: [{}] })).toThrow("'id' string");
  });
});
