import { describe, expect, it } from "vitest";

import { parseSprintContract, SprintContractSchema } from "./sprint-contract.js";

const valid = {
  id: "well-scoped-sprint",
  name: "Well-scoped sprint",
  version: "v1.0.0",
  description: "tiny",
  prompt: "Produce a one-paragraph product brief.",
  generatorAgentId: "orch-milky-way",
  evaluatorAgentId: "orch-cartwheel",
  acceptanceCriteria: [
    "Mentions a target user",
    "Mentions a measurable outcome",
    "Fits in one paragraph",
  ],
  scorers: [
    {
      kind: "llm-judge" as const,
      weight: 0.5,
      passThreshold: 0.7,
      options: {},
    },
  ],
  passThreshold: 0.7,
  maxIterations: 5,
  plateauWindow: 2,
  publishedAt: "2026-06-23T00:00:00.000Z",
};

describe("SprintContract (Phase 8.3)", () => {
  it("accepts a minimal valid contract", () => {
    const parsed = parseSprintContract(valid);
    expect(parsed.id).toBe("well-scoped-sprint");
    expect(parsed.contractVersion).toBe("sprint-contract-v1");
  });

  it("rejects fewer than 3 acceptance criteria", () => {
    expect(() => parseSprintContract({ ...valid, acceptanceCriteria: ["a", "b"] })).toThrow();
  });

  it("rejects more than 7 acceptance criteria", () => {
    const many = ["1", "2", "3", "4", "5", "6", "7", "8"];
    expect(() => parseSprintContract({ ...valid, acceptanceCriteria: many })).toThrow();
  });

  it("rejects an empty scorers array", () => {
    expect(() => parseSprintContract({ ...valid, scorers: [] })).toThrow();
  });

  it("rejects maxIterations > 20", () => {
    expect(() => parseSprintContract({ ...valid, maxIterations: 21 })).toThrow();
  });

  it("rejects plateauWindow > 10", () => {
    expect(() => parseSprintContract({ ...valid, plateauWindow: 11 })).toThrow();
  });

  it("applies sensible defaults", () => {
    const minimal = { ...valid };
    delete (minimal as Record<string, unknown>)["maxIterations"];
    delete (minimal as Record<string, unknown>)["maxIterations"];
    delete (minimal as Record<string, unknown>)["plateauWindow"];
    delete (minimal as Record<string, unknown>)["passThreshold"];
    delete (minimal as Record<string, unknown>)["contractVersion"];
    const parsed = parseSprintContract(minimal);
    expect(parsed.maxIterations).toBe(5);
    expect(parsed.plateauWindow).toBe(2);
    expect(parsed.passThreshold).toBe(0.7);
    expect(parsed.contractVersion).toBe("sprint-contract-v1");
  });

  it("schema is exported and usable standalone", () => {
    const parsed = SprintContractSchema.parse(valid);
    expect(parsed.id).toBe("well-scoped-sprint");
  });
});
