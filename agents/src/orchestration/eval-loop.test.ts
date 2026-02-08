import { describe, expect, it } from "vitest";
import type { IAgentRuntime, AgentRunResult } from "../runtime/types.js";
import type { EvalFn } from "./types.js";
import { evalLoop } from "./eval-loop.js";

function ok(output: Record<string, unknown>): AgentRunResult {
  return { success: true, output, events: [] };
}

function fail(error: string): AgentRunResult {
  return { success: false, output: {}, events: [], error };
}

describe("evalLoop", () => {
  it("returns immediately when first iteration meets threshold", async () => {
    const runtime: IAgentRuntime = {
      async execute() {
        return ok({ draft: "perfect" });
      },
    };

    const evaluator: EvalFn = async () => ({ score: 0.95, feedback: "Excellent" });

    const result = await evalLoop(
      runtime,
      "writer",
      evaluator,
      { prompt: "write something" },
      { maxIterations: 5, threshold: 0.8 },
    );

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.finalScore).toBe(0.95);
    expect(result.output).toEqual({ draft: "perfect" });
  });

  it("improves over iterations and succeeds when threshold met", async () => {
    let callCount = 0;
    const runtime: IAgentRuntime = {
      async execute(request) {
        callCount++;
        const hasFeedback = "feedback" in request.input;
        return ok({
          draft: hasFeedback ? "improved draft" : "initial draft",
          version: callCount,
        });
      },
    };

    const evaluator: EvalFn = async (output) => {
      const version = output["version"] as number;
      const score = version >= 3 ? 0.9 : 0.3 + version * 0.1;
      return { score, feedback: version >= 3 ? "Good enough" : "Needs improvement" };
    };

    const result = await evalLoop(
      runtime,
      "writer",
      evaluator,
      { prompt: "write" },
      { maxIterations: 5, threshold: 0.8 },
    );

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(3);
    expect(result.finalScore).toBe(0.9);
    expect(result.history).toHaveLength(3);
  });

  it("returns best output when max iterations reached", async () => {
    let callCount = 0;
    const runtime: IAgentRuntime = {
      async execute() {
        callCount++;
        return ok({ version: callCount });
      },
    };

    const evaluator: EvalFn = async (output) => {
      const version = output["version"] as number;
      return { score: version * 0.1, feedback: "Not good enough" };
    };

    const result = await evalLoop(
      runtime,
      "writer",
      evaluator,
      { prompt: "write" },
      { maxIterations: 3, threshold: 0.9 },
    );

    expect(result.success).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.finalScore).toBeCloseTo(0.3); // Best: version 3 → 0.3
    expect(result.error).toContain("Max iterations (3) reached");
  });

  it("stops on generator failure", async () => {
    const runtime: IAgentRuntime = {
      async execute() {
        return fail("Generator crashed");
      },
    };

    const evaluator: EvalFn = async () => ({ score: 0, feedback: "" });

    const result = await evalLoop(
      runtime,
      "writer",
      evaluator,
      { prompt: "write" },
      { maxIterations: 5, threshold: 0.8 },
    );

    expect(result.success).toBe(false);
    expect(result.iterations).toBe(1);
    expect(result.error).toBe("Generator crashed");
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const runtime: IAgentRuntime = {
      async execute() {
        return ok({ draft: "should not reach" });
      },
    };

    const evaluator: EvalFn = async () => ({ score: 0, feedback: "" });

    const result = await evalLoop(
      runtime,
      "writer",
      evaluator,
      { prompt: "write" },
      { maxIterations: 5, threshold: 0.8, signal: controller.signal },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Eval loop aborted");
    expect(result.iterations).toBe(0);
  });
});
