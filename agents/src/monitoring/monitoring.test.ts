import { describe, expect, it } from "vitest";
import { InMemoryTracer } from "./tracer.js";
import { InMemoryMetrics } from "./metrics.js";

describe("InMemoryTracer", () => {
  it("creates and ends spans", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("test-operation", { agentId: "ceo" });

    expect(span.name).toBe("test-operation");
    expect(span.status).toBe("unset");
    expect(span.startTime).toBeGreaterThan(0);
    expect(span.attributes["agentId"]).toBe("ceo");

    tracer.endSpan(span, "ok");

    expect(span.status).toBe("ok");
    expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);

    const traces = tracer.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0]!.id).toBe(span.id);
  });

  it("records span events", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("tool-execution");

    tracer.addEvent(span, {
      name: "tool_call",
      timestamp: Date.now(),
      attributes: { toolName: "llm-router" },
    });

    tracer.addEvent(span, {
      name: "tool_result",
      timestamp: Date.now(),
      attributes: { toolName: "llm-router", success: true },
    });

    expect(span.events).toHaveLength(2);
    expect(span.events[0]!.name).toBe("tool_call");
    expect(span.events[1]!.name).toBe("tool_result");
  });

  it("respects trace buffer limit", () => {
    const tracer = new InMemoryTracer(3);

    for (let i = 0; i < 5; i++) {
      const span = tracer.startSpan(`op-${i}`);
      tracer.endSpan(span);
    }

    const traces = tracer.getTraces();
    expect(traces).toHaveLength(3);
    expect(traces[0]!.name).toBe("op-2");
  });

  it("getTraces with limit returns most recent", () => {
    const tracer = new InMemoryTracer();

    for (let i = 0; i < 5; i++) {
      const span = tracer.startSpan(`op-${i}`);
      tracer.endSpan(span);
    }

    const traces = tracer.getTraces(2);
    expect(traces).toHaveLength(2);
    expect(traces[0]!.name).toBe("op-3");
    expect(traces[1]!.name).toBe("op-4");
  });
});

describe("InMemoryMetrics", () => {
  it("increments counters", () => {
    const metrics = new InMemoryMetrics();

    metrics.increment("agent.runs", { agentId: "ceo" });
    metrics.increment("agent.runs", { agentId: "ceo" });
    metrics.increment("agent.runs", { agentId: "orch-veronica" });

    expect(metrics.getCount("agent.runs", { agentId: "ceo" })).toBe(2);
    expect(metrics.getCount("agent.runs", { agentId: "orch-veronica" })).toBe(1);
  });

  it("records histograms", () => {
    const metrics = new InMemoryMetrics();

    metrics.histogram("agent.duration_ms", 100, { agentId: "ceo" });
    metrics.histogram("agent.duration_ms", 200, { agentId: "ceo" });
    metrics.histogram("agent.duration_ms", 50, { agentId: "ceo" });

    const values = metrics.getHistogramValues("agent.duration_ms", { agentId: "ceo" });
    expect(values).toEqual([100, 200, 50]);
  });

  it("getMetrics returns all recorded points", () => {
    const metrics = new InMemoryMetrics();

    metrics.increment("runs");
    metrics.histogram("duration", 150);

    const points = metrics.getMetrics();
    expect(points).toHaveLength(2);
    expect(points[0]!.name).toBe("runs");
    expect(points[1]!.name).toBe("duration");
  });
});
