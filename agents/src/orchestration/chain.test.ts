import { describe, expect, it } from "vitest";
import type { IAgentRuntime, AgentRunResult } from "../runtime/types.js";
import { chain } from "./chain.js";

function mockRuntime(
  responses: Record<string, AgentRunResult>,
): IAgentRuntime {
  return {
    async execute(request) {
      const response = responses[request.agentId];
      if (!response) {
        return { success: false, output: {}, events: [], error: `Unknown agent: ${request.agentId}` };
      }
      return { ...response, output: { ...response.output, receivedInput: request.input } };
    },
  };
}

function ok(output: Record<string, unknown>): AgentRunResult {
  return { success: true, output, events: [] };
}

function fail(error: string): AgentRunResult {
  return { success: false, output: {}, events: [], error };
}

describe("chain", () => {
  it("executes steps sequentially, passing output forward", async () => {
    const runtime = mockRuntime({
      "agent-a": ok({ step: "a", value: 1 }),
      "agent-b": ok({ step: "b", value: 2 }),
      "agent-c": ok({ step: "c", value: 3 }),
    });

    const result = await chain(
      runtime,
      [{ agentId: "agent-a" }, { agentId: "agent-b" }, { agentId: "agent-c" }],
      { prompt: "start" },
    );

    expect(result.success).toBe(true);
    expect(result.stepResults).toHaveLength(3);
    expect(result.output).toMatchObject({ step: "c", value: 3 });
  });

  it("stops on first failure", async () => {
    const runtime = mockRuntime({
      "agent-a": ok({ step: "a" }),
      "agent-b": fail("B exploded"),
      "agent-c": ok({ step: "c" }),
    });

    const result = await chain(
      runtime,
      [{ agentId: "agent-a" }, { agentId: "agent-b" }, { agentId: "agent-c" }],
      { prompt: "start" },
    );

    expect(result.success).toBe(false);
    expect(result.stepResults).toHaveLength(2);
    expect(result.error).toBe("B exploded");
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const runtime = mockRuntime({ "agent-a": ok({ done: true }) });

    const result = await chain(
      runtime,
      [{ agentId: "agent-a" }],
      { prompt: "start" },
      { signal: controller.signal },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chain aborted");
    expect(result.stepResults).toHaveLength(0);
  });

  it("returns initial input for empty chain", async () => {
    const runtime = mockRuntime({});

    const result = await chain(runtime, [], { prompt: "passthrough" });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ prompt: "passthrough" });
    expect(result.stepResults).toHaveLength(0);
  });

  it("applies mapInput to transform between steps", async () => {
    const runtime = mockRuntime({
      "agent-a": ok({ rawData: "hello" }),
      "agent-b": ok({ processed: true }),
    });

    const result = await chain(
      runtime,
      [
        { agentId: "agent-a" },
        {
          agentId: "agent-b",
          mapInput: (prev) => ({ transformed: String(prev["rawData"]).toUpperCase() }),
        },
      ],
      { prompt: "start" },
    );

    expect(result.success).toBe(true);
    // agent-b should have received the transformed input
    expect(result.stepResults[1]!.result.output).toMatchObject({
      receivedInput: { transformed: "HELLO" },
    });
  });

  it("handles runtime exceptions gracefully", async () => {
    const runtime: IAgentRuntime = {
      async execute() {
        throw new Error("Connection lost");
      },
    };

    const result = await chain(
      runtime,
      [{ agentId: "agent-a" }],
      { prompt: "start" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection lost");
    expect(result.stepResults).toHaveLength(1);
  });
});
