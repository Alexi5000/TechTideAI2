/**
 * In-Memory Metrics Implementation
 *
 * Collects counters and histograms in memory.
 * Suitable for development and testing. Swap for Prometheus/OpenTelemetry in production.
 */

import type { IMetrics, MetricPoint } from "./types.js";

export class InMemoryMetrics implements IMetrics {
  private readonly counters = new Map<string, number>();
  private readonly histogramValues = new Map<string, number[]>();
  private readonly points: MetricPoint[] = [];

  private counterKey(name: string, labels?: Record<string, string>): string {
    const labelStr = labels ? Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(",") : "";
    return `${name}|${labelStr}`;
  }

  increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.counterKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + 1);

    this.points.push({
      name,
      value: current + 1,
      labels,
      timestamp: Date.now(),
    });
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.counterKey(name, labels);
    const values = this.histogramValues.get(key) ?? [];
    values.push(value);
    this.histogramValues.set(key, values);

    this.points.push({
      name,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  getMetrics(): MetricPoint[] {
    return [...this.points];
  }

  /**
   * Get the current count for a counter.
   */
  getCount(name: string, labels?: Record<string, string>): number {
    return this.counters.get(this.counterKey(name, labels)) ?? 0;
  }

  /**
   * Get all values recorded for a histogram.
   */
  getHistogramValues(name: string, labels?: Record<string, string>): number[] {
    return this.histogramValues.get(this.counterKey(name, labels)) ?? [];
  }
}
