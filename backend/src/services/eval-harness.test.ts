import { describe, expect, it } from "vitest";

import { EvalHarness } from "./eval-harness.js";
import { ScorerRegistry } from "../domain/policies/scorer-policy.js";
import { ExactMatchScorer } from "./scoring/exact-match.js";
import { RegexScorer } from "./scoring/regex.js";
import { JsonSchemaScorer } from "./scoring/json-schema.js";
import type { Scorer } from "./scoring/interfaces.js";
import type { IAgentRuntime, AgentRunRequest, AgentRunResult } from "@techtide/agents";
import type { EvalSuite } from "../domain/entities/eval-suite.js";
import type { EvalTaskResult } from "../domain/entities/eval-result.js";

function makeRuntime(responses: Record<string, AgentRunResult>): IAgentRuntime {
  return {
    async execute(req: AgentRunRequest): Promise<AgentRunResult> {
      return (
        responses[req.agentId] ?? {
          success: true,
          output: {},
          events: [],
        }
      );
    },
  };
}

const suite: EvalSuite = {
  id: "smoke",
  name: "Smoke",
  version: "v1.0.0",
  description: "tiny",
  publishedAt: new Date().toISOString(),
  scorers: [
    { kind: "exact-match", weight: 0.5, passThreshold: 0.7, options: {} },
    { kind: "regex", weight: 0.5, passThreshold: 0.7, options: {} },
  ],
  tasks: [
    {
      id: "t1",
      agentId: "orch-milky-way",
      tier: "orchestrator",
      category: "format-compliance",
      difficulty: 1,
      input: {},
      expected: { exact: { ok: true }, regex: "ok" },
      rubric: "deterministic golden",
      tags: [],
      timeoutMs: 5000,
    },
    {
      id: "t2",
      agentId: "orch-cartwheel",
      tier: "orchestrator",
      category: "format-compliance",
      difficulty: 1,
      input: {},
      expected: { exact: { ok: true } },
      rubric: "expected to fail exact-match",
      tags: [],
      timeoutMs: 5000,
    },
    {
      id: "t3",
      agentId: "orch-centaurus-a",
      tier: "orchestrator",
      category: "format-compliance",
      difficulty: 1,
      input: {},
      expected: { exact: { ok: true } },
      rubric: "agent missing, should fail cleanly",
      tags: [],
      timeoutMs: 5000,
    },
  ],
};

describe("EvalHarness", () => {
  it("runs the suite end-to-end against a stub runtime", async () => {
    const registry = new ScorerRegistry<Scorer>().extend([
      { kind: "exact-match", version: "1.0.0", factory: () => new ExactMatchScorer() },
      { kind: "regex", version: "1.0.0", factory: () => new RegexScorer() },
    ]);
    const runtime = makeRuntime({
      "orch-milky-way": { success: true, output: { ok: true }, events: [] },
      "orch-cartwheel": { success: true, output: { ok: false }, events: [] },
    });

    const harness = new EvalHarness({ agentRuntime: runtime, scorerRegistry: registry });
    const run = await harness.runSuite({ suite });

    expect(run.taskResults).toHaveLength(3);

    const t1 = run.taskResults[0]! as unknown as EvalTaskResult;
    expect(t1.taskId).toBe("t1");
    expect(t1.passed).toBe(true);
    expect(t1.score).toBe(1);

    const t2 = run.taskResults[1]! as unknown as EvalTaskResult;
    expect(t2.taskId).toBe("t2");
    expect(t2.passed).toBe(false);
    expect(t2.failureReason).toMatch(/exact-match/);

    const t3 = run.taskResults[2]! as unknown as EvalTaskResult;
    expect(t3.taskId).toBe("t3");
    expect(t3.passed).toBe(false);
    // t3's agent ("orch-centaurus-a") is registered but the runtime stub returns
    // the default empty output, so the exact-match scorer fails the task.
    expect(t3.failureReason).toMatch(/exact-match/);

    expect(run.summary).not.toBeNull();
    expect(run.summary!.passRate).toBeCloseTo(1 / 3, 2);
  });

  it("records model + scorer versions on the run", async () => {
    const registry = new ScorerRegistry<Scorer>().extend([
      { kind: "exact-match", version: "9.9.9", factory: () => new ExactMatchScorer() },
    ]);
    const runtime = makeRuntime({
      "orch-milky-way": { success: true, output: { ok: true }, events: [] },
    });
    const oneTaskSuite: EvalSuite = { ...suite, tasks: [suite.tasks[0]!], scorers: [{ kind: "exact-match", weight: 1, passThreshold: 0.7, options: {} }] };

    const harness = new EvalHarness({ agentRuntime: runtime, scorerRegistry: registry });
    const run = await harness.runSuite({ suite: oneTaskSuite });

    expect(run.scorerVersions["exact-match"]).toBe("9.9.9");
    expect(run.modelVersions).toBeTypeOf("object");
  });

  it("uses scorer specs from the suite, not the registry (Phase 8 pre-req C)", async () => {
    // Registry has three scorers; suite declares only `exact-match` with weight 0.2.
    // The harness should run *only* the suite's declared scorers and use the suite's
    // weight, not the registry's defaults.
const registry = new ScorerRegistry<Scorer>().extend([
      { kind: "exact-match", version: "1.0.0", factory: () => new ExactMatchScorer() },
      { kind: "regex", version: "1.0.0", factory: () => new RegexScorer() },
      { kind: "json-schema", version: "1.0.0", factory: () => new JsonSchemaScorer() },
    ]);
    const runtime = makeRuntime({
      "orch-milky-way": { success: true, output: { ok: true }, events: [] },
    });
    const suiteWithOnlyExact: EvalSuite = {
      ...suite,
      tasks: [suite.tasks[0]!],
      scorers: [
        { kind: "exact-match", weight: 0.2, passThreshold: 0.7, options: {} },
      ],
    };
    const harness = new EvalHarness({ agentRuntime: runtime, scorerRegistry: registry });
    const run = await harness.runSuite({ suite: suiteWithOnlyExact });

    expect(run.taskResults).toHaveLength(1);
    const t1 = run.taskResults[0]! as unknown as EvalTaskResult;
    // Only one scorer ran (the suite's), with the suite's weight.
    expect(t1.scorers).toHaveLength(1);
    expect(t1.scorers[0]!.scorer).toBe("exact-match");
    expect(t1.scorers[0]!.weight).toBe(0.2);
    expect(t1.score).toBe(1);
  });
});
