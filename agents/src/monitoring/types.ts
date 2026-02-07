/**
 * Monitoring & Observability Types
 *
 * Defines contracts for execution tracing and metrics collection.
 * Designed to be swappable — in-memory for dev, OpenTelemetry for production.
 */

export interface Span {
  id: string;
  traceId: string;
  parentId?: string | undefined;
  name: string;
  agentId?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  status: "ok" | "error" | "unset";
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown> | undefined;
}

export interface ITracer {
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
  endSpan(span: Span, status?: "ok" | "error"): void;
  addEvent(span: Span, event: SpanEvent): void;
  getTraces(limit?: number): Span[];
}

export interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface IMetrics {
  increment(name: string, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): MetricPoint[];
}
