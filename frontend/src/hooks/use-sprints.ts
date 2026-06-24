/**
 * Sprints hook.
 *
 * Loads recent sprint runs and exposes a manual `triggerRun` action.
 * Sprint runs can be slow (multi-iteration LLM calls); we surface loading
 * state separately from the list refresh so the operator can trigger another
 * sprint without losing the existing list.
 */

import { useCallback, useEffect, useState } from "react";

import { apiClient, type SprintResult } from "@/lib/api-client.js";

export interface UseSprintsResult {
  runs: SprintResult[];
  loading: boolean;
  running: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  triggerRun: (opts?: { contract?: string; concurrency?: number }) => Promise<SprintResult | null>;
}

export function useSprints(opts: { contract?: string; limit?: number } = {}): UseSprintsResult {
  const { contract, limit = 20 } = opts;
  const [runs, setRuns] = useState<SprintResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await apiClient.getSprints({ ...(contract ? { contract } : {}), limit });
      setRuns(fetched);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [contract, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerRun = useCallback(
    async (runOpts: { contract?: string; concurrency?: number } = {}) => {
      setRunning(true);
      setError(null);
      try {
        const run = await apiClient.runSprint(runOpts);
        setRuns((prev) => [run, ...prev].slice(0, 50));
        return run;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [],
  );

  return { runs, loading, running, error, refetch: load, triggerRun };
}
