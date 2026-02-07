/**
 * In-Memory Tracer Implementation
 *
 * Stores execution traces in memory with a configurable buffer size.
 * Suitable for development and testing. Swap for OpenTelemetry in production.
 */

import { randomUUID } from "node:crypto";
import type { ITracer, Span, SpanEvent } from "./types.js";

const DEFAULT_MAX_TRACES = 1000;

export class InMemoryTracer implements ITracer {
  private readonly traces: Span[] = [];
  private readonly maxTraces: number;

  constructor(maxTraces: number = DEFAULT_MAX_TRACES) {
    this.maxTraces = maxTraces;
  }

  startSpan(name: string, attributes: Record<string, unknown> = {}): Span {
    const span: Span = {
      id: randomUUID(),
      traceId: randomUUID(),
      name,
      startTime: Date.now(),
      attributes,
      events: [],
      status: "unset",
    };
    return span;
  }

  endSpan(span: Span, status: "ok" | "error" = "ok"): void {
    span.endTime = Date.now();
    span.status = status;
    this.traces.push(span);

    // Trim buffer
    if (this.traces.length > this.maxTraces) {
      this.traces.splice(0, this.traces.length - this.maxTraces);
    }
  }

  addEvent(span: Span, event: SpanEvent): void {
    span.events.push(event);
  }

  getTraces(limit?: number): Span[] {
    if (limit !== undefined) {
      return this.traces.slice(-limit);
    }
    return [...this.traces];
  }
}
