import { describe, expect, it } from "vitest";

import type { AgentEvent, AgentRunResult } from "./types.js";

describe("IAgentRuntime contracts (Phase 8 pre-req A)", () => {
  it("AgentEvent.type includes the approval_* variants the runtime actually emits", () => {
    // Compile-time check via assignment: if a literal isn't in the union, this fails.
    const events: AgentEvent[] = [
      { type: "tool_call", timestamp: "2026-06-23T00:00:00.000Z", payload: {} },
      { type: "tool_result", timestamp: "2026-06-23T00:00:00.000Z", payload: {} },
      { type: "message", timestamp: "2026-06-23T00:00:00.000Z", payload: {} },
      { type: "error", timestamp: "2026-06-23T00:00:00.000Z", payload: {} },
      { type: "approval_requested", timestamp: "2026-06-23T00:00:00.000Z", payload: { approvalId: "a" } },
      { type: "approval_granted", timestamp: "2026-06-23T00:00:00.000Z", payload: { approvalId: "a" } },
      { type: "approval_denied", timestamp: "2026-06-23T00:00:00.000Z", payload: { approvalId: "a" } },
    ];
    expect(events).toHaveLength(7);
  });

  it("AgentRunResult keeps the approvalId passthrough", () => {
    const result: AgentRunResult = {
      success: true,
      output: { phase: "awaiting-approval" },
      events: [],
      approvalId: "approval-stub-1",
    };
    expect(result.approvalId).toBe("approval-stub-1");
  });
});
