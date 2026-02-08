/**
 * Monitoring Singletons
 *
 * Application-scoped instances of tracer and metrics.
 * Imported by routes that need observability and by server bootstrap.
 */

import { InMemoryTracer, InMemoryMetrics } from "@techtide/agents";

export const tracer = new InMemoryTracer();
export const metrics = new InMemoryMetrics();
