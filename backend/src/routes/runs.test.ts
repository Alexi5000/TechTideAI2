import { afterEach, describe, expect, it } from "vitest";

import {
  getTraceTree,
  resetTraceBuffer,
  startSpan,
  withSpan,
} from "../services/trace-service.js";

afterEach(() => {
  resetTraceBuffer();
});

describe("trace route enrichment (Phase 8.7)", () => {
  it("startSpan attributes survive end() and surface in getTraceTree", () => {
    const parent = startSpan({ name: "three-agent-harness.runSprint" });
    const child = startSpan({
      name: "sprint.evaluator",
      parentSpanId: parent.spanId,
      traceId: parent.traceId,
    });
    child.setAttribute("eval.iteration", 1);
    child.setAttribute("eval.score", 0.85);
    child.setAttribute("eval.passed", true);
    child.end("ok");
    parent.end("ok", { "sprint.iterations": 1 });

    const tree = getTraceTree(parent.traceId);
    expect(tree).not.toBeNull();
    expect(tree!.rootSpanName).toBe("three-agent-harness.runSprint");
    const evaluator = tree!.spans.find((s) => s.name === "sprint.evaluator");
    expect(evaluator).toBeDefined();
    expect(evaluator!.attributes["eval.score"]).toBe(0.85);
    expect(evaluator!.attributes["eval.passed"]).toBe(true);
  });

  it("withSpan captures error status when the wrapped function throws", async () => {
    let traceId = "";
    await expect(
      withSpan("outer", async (s) => {
        traceId = s.traceId;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const tree = getTraceTree(traceId);
    expect(tree).not.toBeNull();
    const failing = tree!.spans.find((s) => s.name === "outer");
    expect(failing!.status).toBe("error");
    expect(failing!.attributes["error.message"]).toBe("boom");
  });
});
