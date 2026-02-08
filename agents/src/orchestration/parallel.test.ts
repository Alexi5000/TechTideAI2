import { describe, expect, it } from "vitest";
import type { IAgentRuntime, AgentRunResult } from "../runtime/types.js";
import { parallel } from "./parallel.js";

function mockRuntime(
  responses: Record<string, AgentRunResult>,
): IAgentRuntime {
  return {
    async execute(request) {
      const response = responses[request.agentId];
      if (!response) {
        return { success: false, output: {}, events: [], error: `Unknown agent: ${request.agentId}` };
      }
      return response;
    },
  };
}

function ok(output: Record<string, unknown>): AgentRunResult {
  return { success: true, output, events: [] };
}

function fail(error: string): AgentRunResult {
  return { success: false, output: {}, events: [], error };
}

describe("parallel", () => {
  it("executes all branches concurrently and gathers results", async () => {
    const runtime = mockRuntime({
      "agent-a": ok({ value: "a" }),
      "agent-b": ok({ value: "b" }),
      "agent-c": ok({ value: "c" }),
    });

    const result = await parallel(runtime, [
      { key: "branch-a", agentId: "agent-a", input: { prompt: "go" } },
      { key: "branch-b", agentId: "agent-b", input: { prompt: "go" } },
      { key: "branch-c", agentId: "agent-c", input: { prompt: "go" } },
    ]);

    expect(result.success).toBe(true);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.branches["branch-a"]!.result.output).toEqual({ value: "a" });
    expect(result.branches["branch-b"]!.result.output).toEqual({ value: "b" });
    expect(result.branches["branch-c"]!.result.output).toEqual({ value: "c" });
  });

  it("reports partial failure without stopping other branches", async () => {
    const runtime = mockRuntime({
      "agent-a": ok({ value: "a" }),
      "agent-b": fail("B failed"),
      "agent-c": ok({ value: "c" }),
    });

    const result = await parallel(runtime, [
      { key: "branch-a", agentId: "agent-a", input: {} },
      { key: "branch-b", agentId: "agent-b", input: {} },
      { key: "branch-c", agentId: "agent-c", input: {} },
    ]);

    expect(result.success).toBe(false);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.branches["branch-b"]!.result.error).toBe("B failed");
  });

  it("retries failed branches up to configured limit", async () => {
    let callCount = 0;
    const runtime: IAgentRuntime = {
      async execute(request) {
        if (request.agentId === "flaky") {
          callCount++;
          if (callCount < 3) {
            return fail(`Attempt ${callCount} failed`);
          }
          return ok({ recovered: true });
        }
        return ok({ stable: true });
      },
    };

    const result = await parallel(
      runtime,
      [
        { key: "stable", agentId: "stable", input: {} },
        { key: "flaky", agentId: "flaky", input: {} },
      ],
      { retries: 3 },
    );

    expect(result.success).toBe(true);
    expect(result.succeeded).toBe(2);
    expect(result.branches["flaky"]!.result.output).toEqual({ recovered: true });
    expect(result.branches["flaky"]!.attempts).toBe(3);
  });

  it("respects concurrency limit", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const runtime: IAgentRuntime = {
      async execute() {
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) {
          maxConcurrent = currentConcurrent;
        }
        await new Promise((r) => setTimeout(r, 10));
        currentConcurrent--;
        return ok({ done: true });
      },
    };

    const branches = Array.from({ length: 6 }, (_, i) => ({
      key: `b-${i}`,
      agentId: `agent-${i}`,
      input: {},
    }));

    const result = await parallel(runtime, branches, { concurrency: 2 });

    expect(result.success).toBe(true);
    expect(result.succeeded).toBe(6);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const runtime = mockRuntime({ "agent-a": ok({ done: true }) });

    const result = await parallel(
      runtime,
      [{ key: "a", agentId: "agent-a", input: {} }],
      { signal: controller.signal },
    );

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
  });

  it("returns empty result for empty branches", async () => {
    const runtime = mockRuntime({});

    const result = await parallel(runtime, []);

    expect(result.success).toBe(true);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });
});
