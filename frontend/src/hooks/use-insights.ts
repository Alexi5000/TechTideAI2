/**
 * Insights Hook
 *
 * Fetches KPI summary and execution map with automatic polling.
 * Owns all insights-related state (KPIs + execution map).
 */

import { useState, useEffect } from "react";
import { apiClient, type KpiSummary, type ExecutionMapSummary } from "@/lib/api-client.js";

const POLL_INTERVAL_MS = 10_000;

interface UseInsightsResult {
  kpis: KpiSummary | null;
  executionMap: ExecutionMapSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useInsights(): UseInsightsResult {
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [executionMap, setExecutionMap] = useState<ExecutionMapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Initial load of KPIs + execution map
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kpiData, mapData] = await Promise.all([
          apiClient.getKpis(),
          apiClient.getExecutionMap(),
        ]);
        if (!cancelled) {
          setKpis(kpiData);
          setExecutionMap(mapData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load insights");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshToken]);

  // Poll execution map every 10s for real-time status
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const mapData = await apiClient.getExecutionMap();
        if (!cancelled) {
          setExecutionMap(mapData);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Execution map poll failed:", err);
        }
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function refresh() {
    setRefreshToken((n) => n + 1);
  }

  return { kpis, executionMap, loading, error, refresh };
}
