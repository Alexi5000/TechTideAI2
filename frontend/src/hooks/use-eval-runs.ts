/**
 * Eval Runs Hook
 *
 * Loads recent eval runs and exposes a manual `triggerRun` action.
 * Eval runs can be slow (judge LLM calls); we surface loading state separately
 * from the list refresh so the operator can trigger another run without losing
 * the existing list.
 */

import { useCallback, useEffect, useState } from "react";

import { apiClient, type EvalRun, type EvalSuiteSummary } from "@/lib/api-client.js";

export interface UseEvalRunsResult {
  runs: EvalRun[];
  suites: EvalSuiteSummary[];
  loading: boolean;
  running: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  triggerRun: (opts?: { suite?: string; baseline?: string; concurrency?: number; judgeModel?: string }) => Promise<EvalRun | null>;
}

export function useEvalRuns(): UseEvalRunsResult {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [suites, setSuites] = useState<EvalSuiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedRuns, fetchedSuites] = await Promise.all([
        apiClient.getEvalRuns({ limit: 20 }),
        apiClient.getEvalSuites().catch(() => [] as EvalSuiteSummary[]),
      ]);
      setRuns(fetchedRuns);
      setSuites(fetchedSuites);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerRun = useCallback(
    async (opts: { suite?: string; baseline?: string; concurrency?: number; judgeModel?: string } = {}) => {
      setRunning(true);
      setError(null);
      try {
        const run = await apiClient.runEval(opts);
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

  return { runs, suites, loading, running, error, refetch: load, triggerRun };
}
