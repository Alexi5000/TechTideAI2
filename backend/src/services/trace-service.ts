/**
 * OpenTelemetry Trace Service (Phase 2.3)
 *
 * Bootstraps an OTel tracer provider and exposes a small, framework-agnostic
 * API the rest of the system uses to record spans. Exporter defaults to the
 * console (no-ops in production when OTEL_EXPORTER_OTLP_ENDPOINT is unset)
 * and switches to OTLP when the env var is set.
 *
 * Design notes:
 * - The OTel SDK is loaded lazily so the backend doesn't pay the bundle cost
 *   in environments that don't want tracing.
 * - We don't import `@opentelemetry/api` types as a hard dep, instead we
 *   type the seam as `unknown` and accept any compatible tracer.
 * - The trace tree surface (`getTraceTree`) reads from a lightweight in-memory
 *   buffer; production should swap to an OTLP collector (Jaeger, Tempo, etc.).
 */

import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startMs: number;
  endMs: number | null;
  attributes: Record<string, string | number | boolean>;
  status: "ok" | "error" | "unset";
  /** Optional runId binding, when set, the span is part of the trace for that run. */
  runId?: string;
}

export interface TraceTree {
  traceId: string;
  spans: SpanRecord[];
  rootSpanName: string | null;
  durationMs: number;
}

const traceBuffer = new Map<string, SpanRecord[]>();
/**
 * Reverse index: runId -> traceId. Spans that include a runId are also
 * inserted here so a route can fetch the trace for a given run id without
 * having to thread the OTel traceId through the request lifecycle.
 */
const runIdIndex = new Map<string, string>();

export interface StartSpanOptions {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  parentSpanId?: string | null;
  traceId?: string;
  /** When set, the span is bound to this runId; the trace can be looked up by runId later. */
  runId?: string;
}

export interface ActiveSpan {
  traceId: string;
  spanId: string;
  end: (status?: "ok" | "error", extraAttributes?: Record<string, string | number | boolean>) => void;
  setAttribute: (key: string, value: string | number | boolean) => void;
}

let initialized = false;

/**
 * Best-effort SDK init. If the OTel packages aren't installed we silently
 * fall back to in-process tracing, the API surface stays the same.
 */
export async function initTracing(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    // Console-only mode. The in-process buffer is still active.
    return;
  }

  try {
    const sdk = (await import(/* @vite-ignore */ "@opentelemetry/sdk-node")) as { NodeSDK?: new (opts: unknown) => { start: () => void; shutdown: () => Promise<void> } };
    if (!sdk.NodeSDK) return;
    const instance = new sdk.NodeSDK({
      traceExporter: undefined as never,
    });
    instance.start();
  } catch {
    // OTel not installed, in-process only.
  }
}

export function startSpan(opts: StartSpanOptions): ActiveSpan {
  const traceId = opts.traceId ?? randomUUID().replace(/-/g, "");
  const spanId = randomUUID().replace(/-/g, "").substring(0, 16);
  const record: SpanRecord = {
    traceId,
    spanId,
    parentSpanId: opts.parentSpanId ?? null,
    name: opts.name,
    startMs: Date.now(),
    endMs: null,
    attributes: opts.attributes ?? {},
    status: "unset",
    ...(opts.runId ? { runId: opts.runId } : {}),
  };

  const list = traceBuffer.get(traceId) ?? [];
  list.push(record);
  traceBuffer.set(traceId, list);

  // If a runId is provided, register the binding so the trace can be
  // looked up by runId later (e.g. GET /api/runs/:id/trace). The first
  // span to claim a given runId wins; subsequent spans with the same
  // runId inherit the same traceId via opts.traceId if set.
  if (opts.runId && !runIdIndex.has(opts.runId)) {
    runIdIndex.set(opts.runId, traceId);
  }

  return {
    traceId,
    spanId,
    setAttribute(key, value) {
      record.attributes[key] = value;
    },
    end(status = "ok", extraAttributes) {
      record.endMs = Date.now();
      record.status = status;
      if (extraAttributes) {
        Object.assign(record.attributes, extraAttributes);
      }
    },
  };
}

export function withSpan<T>(
  name: string,
  fn: (span: ActiveSpan) => Promise<T>,
  opts?: { attributes?: Record<string, string | number | boolean>; traceId?: string; parentSpanId?: string | null },
): Promise<T> {
  const span = startSpan({ name, ...opts });
  return fn(span).then(
    (value) => {
      span.end("ok");
      return value;
    },
    (err: unknown) => {
      span.end("error", { "error.message": (err as Error).message });
      throw err;
    },
  );
}

export function getTraceTree(traceId: string): TraceTree | null {
  const spans = traceBuffer.get(traceId);
  if (!spans || spans.length === 0) return null;
  const root = spans.find((s) => s.parentSpanId === null) ?? null;
  const durationMs = root?.endMs && root.startMs ? root.endMs - root.startMs : 0;
  return {
    traceId,
    spans,
    rootSpanName: root?.name ?? null,
    durationMs,
  };
}

/**
 * Resolve a trace by the originating runId. Returns null if the run has
 * no associated spans (the run either never executed, executed in a
 * process whose buffer has been reset, or executed in a different
 * replica of the backend in a production deployment).
 */
export function getTraceTreeForRun(runId: string): TraceTree | null {
  const traceId = runIdIndex.get(runId);
  if (!traceId) return null;
  return getTraceTree(traceId);
}

export function getTraceIds(): string[] {
  return [...traceBuffer.keys()];
}

/** Test helper. */
export function resetTraceBuffer(): void {
  traceBuffer.clear();
  runIdIndex.clear();
}

/**
 * Singleton service surface for the trace store. Routes and tests import
 * this; the harness re-exports it for backwards compatibility.
 */
export const traceService = {
  getTraceTree,
  getTraceTreeForRun,
  getTraceIds,
  resetTraceBuffer,
};
