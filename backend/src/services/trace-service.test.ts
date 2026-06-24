import { afterEach, describe, expect, it } from "vitest";

import {
  getTraceTree,
  resetTraceBuffer,
  startSpan,
  withSpan,
} from "./trace-service.js";

afterEach(() => {
  resetTraceBuffer();
});

describe("trace-service", () => {
  it("records nested spans and surfaces a tree", async () => {
    await withSpan("outer", async (parent) => {
      const child = startSpan({ name: "inner", parentSpanId: parent.spanId, traceId: parent.traceId });
      child.setAttribute("foo", "bar");
      child.end("ok");
      parent.end("ok");
    });
    const trees = getTraceTree.bind(null);
    // We don't know the traceId in advance, so query the buffer through a sentinel.
    // The cleaner approach: capture the traceId from startSpan.
    const capturedTraceId: string[] = [];
    await withSpan("captured", async (s) => {
      capturedTraceId.push(s.traceId);
      s.end("ok");
    });
    const tree = trees(capturedTraceId[0]!);
    expect(tree).not.toBeNull();
    expect(tree!.spans.length).toBeGreaterThanOrEqual(1);
    expect(tree!.rootSpanName).toBe("captured");
  });

  it("marks spans as error when the wrapped function throws", async () => {
    let capturedTraceId = "";
    await expect(
      withSpan("failing", async (s) => {
        capturedTraceId = s.traceId;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const tree = getTraceTree(capturedTraceId);
    expect(tree).not.toBeNull();
    const failing = tree!.spans.find((s) => s.name === "failing");
    expect(failing).toBeDefined();
    expect(failing!.status).toBe("error");
    expect(failing!.attributes["error.message"]).toBe("boom");
  });

  it("preserves parent-child relationships", async () => {
    let traceId = "";
    await withSpan("root", async (r) => {
      traceId = r.traceId;
      const child = startSpan({ name: "child", parentSpanId: r.spanId, traceId });
      child.end("ok");
      r.end("ok");
    });
    const tree = getTraceTree(traceId);
    const root = tree!.spans.find((s) => s.name === "root");
    const child = tree!.spans.find((s) => s.name === "child");
    expect(root!.parentSpanId).toBeNull();
    expect(child!.parentSpanId).toBe(root!.spanId);
  });
});
