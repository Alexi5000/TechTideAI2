/**
 * Monitoring Routes
 *
 * Exposes observability data: metrics and execution traces.
 */

import type { FastifyInstance } from "fastify";

/**
 * In-memory stores for metrics and traces.
 * These are populated by the monitoring module in the agents package.
 * For now, they return empty data — the integration point is ready.
 */
let metricsStore: Array<{ name: string; value: number; labels: Record<string, string>; timestamp: number }> = [];
let tracesStore: Array<Record<string, unknown>> = [];

export function setMetricsStore(metrics: typeof metricsStore): void {
  metricsStore = metrics;
}

export function setTracesStore(traces: typeof tracesStore): void {
  tracesStore = traces;
}

export async function registerMonitoringRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/monitoring/metrics", async (_request, reply) => {
    return reply.send({
      metrics: metricsStore,
      count: metricsStore.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get<{
    Querystring: { limit?: string };
  }>("/api/monitoring/traces", async (request, reply) => {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
    const traces = tracesStore.slice(-limit);

    return reply.send({
      traces,
      count: traces.length,
      timestamp: new Date().toISOString(),
    });
  });
}
