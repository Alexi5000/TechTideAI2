/**
 * Run Hooks
 *
 * React hooks for managing agent runs with polling support.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, type Run, type RunEvent, type RunStatus } from "../lib/api-client";

interface UseAgentRunResult {
  run: Run | null;
  loading: boolean;
  error: Error | null;
  startRun: (agentId: string, input: Record<string, unknown>) => Promise<Run | null>;
  reset: () => void;
}

/**
 * Hook to trigger and track an agent run
 */
export function useAgentRun(): UseAgentRunResult {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startRun = useCallback(
    async (agentId: string, input: Record<string, unknown>): Promise<Run | null> => {
      setLoading(true);
      setError(null);
      try {
        const newRun = await apiClient.runAgent(agentId, input);
        setRun(newRun);
        return newRun;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to start run");
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setRun(null);
    setError(null);
    setLoading(false);
  }, []);

  return { run, loading, error, startRun, reset };
}

// Polling interval - configurable via environment variable
const DEFAULT_POLL_INTERVAL_MS = 2000;
const POLL_INTERVAL_MS =
  parseInt(import.meta.env["VITE_RUN_POLL_INTERVAL_MS"] ?? "", 10) || DEFAULT_POLL_INTERVAL_MS;
const TERMINAL_STATUSES: RunStatus[] = ["succeeded", "failed", "canceled"];

interface UseRunPollingResult {
  run: Run | null;
  loading: boolean;
  error: Error | null;
  isPolling: boolean;
}

/**
 * Hook to poll a run's status until it reaches a terminal state
 */
export function useRunPolling(runId: string | null): UseRunPollingResult {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      setIsPolling(false);
      return;
    }

    const currentRunId = runId; // Capture for closure
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      setLoading(true);
      try {
        const updatedRun = await apiClient.getRun(currentRunId);
        if (cancelled) return;

        setRun(updatedRun);
        setError(null);

        // Continue polling if not in terminal state
        if (!TERMINAL_STATUSES.includes(updatedRun.status)) {
          setIsPolling(true);
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setIsPolling(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to fetch run"));
        setIsPolling(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [runId]);

  return { run, loading, error, isPolling };
}

interface UseRunsResult {
  runs: Run[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to list runs for an organization
 */
export function useRuns(orgId?: string, limit?: number): UseRunsResult {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchRuns() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getRuns(orgId, limit);
        if (!cancelled) {
          setRuns(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch runs"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRuns();

    return () => {
      cancelled = true;
    };
  }, [orgId, limit, refreshToken]);

  const refetch = () => setRefreshToken((n) => n + 1);

  return { runs, loading, error, refetch };
}

interface UseRunEventsResult {
  events: RunEvent[];
  loading: boolean;
  error: Error | null;
}

export function useRunEvents(
  runId: string | null,
  status?: RunStatus | null,
): UseRunEventsResult {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const currentRunId = runId;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getRunEvents(currentRunId);
        if (!cancelled) {
          setEvents(data.events);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch run events"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    if (!status || !TERMINAL_STATUSES.includes(status)) {
      intervalId = setInterval(fetchEvents, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [runId, status]);

  return { events, loading, error };
}
