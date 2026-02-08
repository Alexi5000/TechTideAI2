import { describe, expect, it } from "vitest";
import type { IAgentRuntime, AgentRunResult } from "../runtime/types.js";
import type { Classifier } from "./types.js";
import { route } from "./route.js";

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

function staticClassifier(category: string, confidence: number): Classifier {
  return async () => ({ category, confidence });
}

describe("route", () => {
  const routeMap = {
    images: "image-agent",
    text: "text-agent",
    video: "video-agent",
  };

  it("classifies input and routes to the correct agent", async () => {
    const runtime = mockRuntime({
      "image-agent": ok({ type: "image", processed: true }),
    });

    const result = await route(
      runtime,
      staticClassifier("images", 0.95),
      routeMap,
      { prompt: "generate a logo" },
    );

    expect(result.success).toBe(true);
    expect(result.classification.category).toBe("images");
    expect(result.selectedAgentId).toBe("image-agent");
    expect(result.result.output).toEqual({ type: "image", processed: true });
  });

  it("falls back when confidence is below threshold", async () => {
    const runtime = mockRuntime({
      "fallback-agent": ok({ fallback: true }),
    });

    const result = await route(
      runtime,
      staticClassifier("images", 0.3),
      routeMap,
      { prompt: "ambiguous input" },
      { confidenceThreshold: 0.5, fallbackAgentId: "fallback-agent" },
    );

    expect(result.success).toBe(true);
    expect(result.selectedAgentId).toBe("fallback-agent");
  });

  it("falls back when category has no matching route", async () => {
    const runtime = mockRuntime({
      "fallback-agent": ok({ fallback: true }),
    });

    const result = await route(
      runtime,
      staticClassifier("audio", 0.9),
      routeMap,
      { prompt: "play music" },
      { fallbackAgentId: "fallback-agent" },
    );

    expect(result.success).toBe(true);
    expect(result.selectedAgentId).toBe("fallback-agent");
  });

  it("fails when no route matches and no fallback configured", async () => {
    const runtime = mockRuntime({});

    const result = await route(
      runtime,
      staticClassifier("unknown", 0.1),
      routeMap,
      { prompt: "???" },
      { confidenceThreshold: 0.5 },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("No route for category");
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const runtime = mockRuntime({});

    const result = await route(
      runtime,
      staticClassifier("images", 0.9),
      routeMap,
      { prompt: "go" },
      { signal: controller.signal },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Route aborted");
  });
});
