import { describe, expect, it } from "vitest";
import { createInvokeAgentTool } from "./invoke-agent.js";

describe("invoke-agent tool", () => {
  const emptyContext = {} as never;

  it("rejects invocation of agents not in the allowed list", async () => {
    const tool = createInvokeAgentTool(["worker-research", "worker-qa"]);

    const result = await tool.execute!(
      { agentId: "worker-data", input: { prompt: "test" } },
      emptyContext,
    );

    expect(result).toMatchObject({
      agentId: "worker-data",
      success: false,
    });
    expect(result.error).toContain("Cannot invoke");
    expect(result.error).toContain("worker-research");
  });

  it("rejects invocation when allowed list is empty", async () => {
    const tool = createInvokeAgentTool([]);

    const result = await tool.execute!(
      { agentId: "ceo", input: { prompt: "test" } },
      emptyContext,
    );

    expect(result).toMatchObject({
      agentId: "ceo",
      success: false,
    });
    expect(result.error).toContain("Cannot invoke");
  });

  it("rejects unknown agents even if in allowed list", async () => {
    const tool = createInvokeAgentTool(["nonexistent-agent"]);

    const result = await tool.execute!(
      { agentId: "nonexistent-agent", input: { prompt: "test" } },
      emptyContext,
    );

    expect(result).toMatchObject({
      agentId: "nonexistent-agent",
      success: false,
    });
    expect(result.error).toContain("not found in registry");
  });

  it("includes allowed targets in tool description", () => {
    const tool = createInvokeAgentTool(["worker-a", "worker-b"]);
    expect(tool.description).toContain("worker-a");
    expect(tool.description).toContain("worker-b");
  });
});
