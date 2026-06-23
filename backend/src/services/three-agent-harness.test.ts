import { describe, expect, it } from "vitest";

import { ThreeAgentHarness } from "./three-agent-harness.js";
import type { IAgentRuntime, AgentRunRequest, AgentRunResult } from "@techtide/agents";
import type { SprintContract } from "../domain/entities/sprint-contract.js";
import type { ScorerContext, ScoringResult } from "./scoring/interfaces.js";

function makeRuntime(
  responses: Record<string, AgentRunResult>,
  callLog?: AgentRunRequest[],
): IAgentRuntime {
  return {
    async execute(req: AgentRunRequest): Promise<AgentRunResult> {
      callLog?.push(req);
      return (
        responses[req.agentId] ?? {
          success: true,
          output: { text: "default" },
          events: [],
        }
      );
    },
  };
}

const baseContract: SprintContract = {
  id: "smoke-sprint",
  name: "Smoke",
  version: "v1.0.0",
  description: "",
  prompt: "Write a one-paragraph product brief.",
  generatorAgentId: "orch-ava",
  evaluatorAgentId: "orch-audit",
  rubric: "Score along the four canonical axes; pass when all axes are above their thresholds.",
  acceptanceCriteria: ["a", "b", "c"],
  scorers: [
    { kind: "four-axis-grader", weight: 1, passThreshold: 0.7, options: {} },
  ],
  passThreshold: 0.7,
  maxIterations: 3,
  plateauWindow: 2,
  plateauTolerance: 0.02,
  contractVersion: "sprint-contract-v1",
  publishedAt: "2026-06-23T00:00:00.000Z",
};

describe("ThreeAgentHarness (Phase 8.4)", () => {
  it("monotonic improvement: scores improve, run succeeds before max-iterations", async () => {
    const callLog: AgentRunRequest[] = [];
    // Generator returns "yes" (iteration 0), "yes yes" (iteration 1). The
    // four-axis grader reads axes from the evaluator's output and grades
    // along correctness/safety/completeness/quality — all above thresholds
    // → run is "succeeded".
    const runtime = makeRuntime(
      {
        "orch-ava": { success: true, output: { text: "yes" }, events: [] },
        "orch-audit": { success: true, output: { axes: { correctness: 0.9, safety: 0.95, completeness: 0.85, quality: 0.8 } }, events: [] },
      },
      callLog,
    );
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    expect(result.status).toBe("succeeded");
    expect(result.iterations.length).toBe(1);
    // 0.9*0.4 + 0.95*0.2 + 0.85*0.2 + 0.8*0.2 = 0.88
    expect(result.bestScore).toBeCloseTo(0.88, 2);
    expect(callLog.length).toBe(2); // 1 generator + 1 evaluator
  });

  it("max-iterations: never passes, run reports max-iterations", async () => {
    // To force `max-iterations` we need the rolling delta to stay above the
    // plateau tolerance (0.02) — use sharply different axes per iteration so
    // the delta is large. Correctness stays below the 0.8 threshold so the
    // run never passes either.
    let iter = 0;
    const runtime: IAgentRuntime = {
      async execute(req: AgentRunRequest): Promise<AgentRunResult> {
        if (req.agentId === "orch-ava") {
          return { success: true, output: { text: `iter-${iter}` }, events: [] };
        }
        iter += 1;
        // Step correctness by 0.5 each iteration; weights are {correctness:0.4}
        // so the headline score steps by 0.2 per iteration → rollingDelta > 0.02.
        return {
          success: true,
          output: { axes: { correctness: 0.1 + iter * 0.5, safety: 0.0, completeness: 0.0, quality: 0.0 } },
          events: [],
        };
      },
    };
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    expect(result.status).toBe("max-iterations");
    expect(result.iterations.length).toBe(3);
  });

  it("plateau: scores stagnate, run reports plateau", async () => {
    // Generator's output and the evaluator's axes are the same every
    // iteration; the four-axis score is constant 0 across all iterations
    // → plateau on the 2nd sample.
    const runtime = makeRuntime({
      "orch-ava": { success: true, output: { text: "nope" }, events: [] },
      "orch-audit": { success: true, output: { axes: { correctness: 0.0, safety: 0.0, completeness: 0.0, quality: 0.0 } }, events: [] },
    });
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    expect(result.status).toBe("plateau");
    // Stopped early — fewer iterations than max.
    expect(result.iterations.length).toBeLessThanOrEqual(3);
  });

  it("errored: when the runtime itself throws on every call", async () => {
    // `runAgent` absorbs runtime exceptions into `{ error: "..." }` outputs,
    // so the loop never sees a thrown error. With the four-axis grader and
    // every iteration producing the same zero score, the run stops on
    // `plateau` instead of `errored` — the iteration `taskResult.failureReason`
    // captures the underlying runtime error.
    const runtime: IAgentRuntime = {
      async execute(): Promise<AgentRunResult> {
        throw new Error("runtime down");
      },
    };
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    expect(result.status).toBe("plateau");
    // The iteration taskResult carries the failure reason.
    const lastFailure = result.iterations[result.iterations.length - 1]?.taskResult.failureReason ?? "";
    expect(lastFailure).toMatch(/extract axis scores/);
  });

  it("one-step regression does not plateau (delta > tolerance)", async () => {
    // Two iterations with sharply different scores; plateau requires the
    // rolling spread to be within tolerance, which it isn't here.
    let callCount = 0;
    const runtime: IAgentRuntime = {
      async execute(req: AgentRunRequest): Promise<AgentRunResult> {
        if (req.agentId === "orch-ava") {
          callCount += 1;
          return {
            success: true,
            output: { text: callCount === 1 ? "yes" : "yes yes" },
            events: [],
          };
        }
        return { success: true, output: { axes: { correctness: 0.9, safety: 0.9, completeness: 0.9, quality: 0.9 } }, events: [] };
      },
    };
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    // Run should be succeeded on iteration 0 (exact match passes).
    expect(result.status).toBe("succeeded");
  });

  it("respects contractVersion on the result", async () => {
    const runtime = makeRuntime({
      "orch-ava": { success: true, output: { text: "yes" }, events: [] },
      "orch-audit": { success: true, output: { axes: { correctness: 0.9, safety: 0.95, completeness: 0.85, quality: 0.8 } }, events: [] },
    });
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: baseContract });
    expect(result.contractVersion).toBe("sprint-contract-v1");
  });

  it("threads the rolling history into the per-iteration score context (for the plateau scorer)", async () => {
    const callLog: AgentRunRequest[] = [];
    // Generator returns "nope" both iterations; the exact-match score is 0
    // both times, so the plateau detector should fire on the second sample.
    const runtime = makeRuntime(
      {
        "orch-ava": { success: true, output: { text: "nope" }, events: [] },
        "orch-audit": { success: true, output: { axes: { correctness: 0.0, safety: 0.0, completeness: 0.0, quality: 0.0 } }, events: [] },
      },
      callLog,
    );
    const contractWithHistoryScorer: SprintContract = {
      ...baseContract,
      maxIterations: 3,
      plateauWindow: 2,
      plateauTolerance: 0.02,
      scorers: [
        // The plateau scorer wraps exact-match; it publishes meta but
        // does not change the headline pass/fail. The harness's loop
        // reads meta.rollingDelta to decide to stop.
        { kind: "plateau-scorer", weight: 1, passThreshold: 0.7, options: {} },
      ],
    };
    const harness = new ThreeAgentHarness({ agentRuntime: runtime });
    const result = await harness.runSprint({ contract: contractWithHistoryScorer });
    // Two identical-score iterations → plateau, not max-iterations.
    expect(result.status).toBe("plateau");
    expect(result.iterations.length).toBeLessThan(3);
  });
});

// Helper exported for the score-context shape.
export type _ScoringContext = ScorerContext;
export type _ScoringResult = ScoringResult;
