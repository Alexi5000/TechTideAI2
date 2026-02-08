/**
 * Monitoring Routes
 *
 * Exposes observability data: metrics and execution traces.
 * Data sources are bound at startup via setMetricsSource / setTracerSource.
 */

import type { FastifyInstance } from "fastify";
import type { ITracer, IMetrics } from "@techtide/agents";

let metricsSource: IMetrics | null = null;
let tracerSource: ITracer | null = null;

export function setMetricsSource(source: IMetrics): void {
  metricsSource = source;
}

export function setTracerSource(source: ITracer): void {
  tracerSource = source;
}

export async function registerMonitoringRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/monitoring/metrics", async (_request, reply) => {
    const metrics = metricsSource?.getMetrics() ?? [];
    return reply.send({
      metrics,
      count: metrics.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get<{
    Querystring: { limit?: string };
  }>("/api/monitoring/traces", async (request, reply) => {
    const rawLimit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 1000)) : 100;
    const traces = tracerSource?.getTraces(limit) ?? [];

    return reply.send({
      traces,
      count: traces.length,
      timestamp: new Date().toISOString(),
    });
  });
}
