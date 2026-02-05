/**
 * Run Hooks
 *
 * React hooks for managing agent runs with polling support.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "../lib/api-client";
// Default org ID for MVP (matches backend and seed data)
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
/**
 * Hook to trigger and track an agent run
 */
export function useAgentRun() {
    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const startRun = useCallback(async (agentId, input) => {
        setLoading(true);
        setError(null);
        try {
            const newRun = await apiClient.runAgent(agentId, input);
            setRun(newRun);
            return newRun;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to start run");
            setError(error);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const reset = useCallback(() => {
        setRun(null);
        setError(null);
        setLoading(false);
    }, []);
    return { run, loading, error, startRun, reset };
}
const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = ["succeeded", "failed", "canceled"];
/**
 * Hook to poll a run's status until it reaches a terminal state
 */
export function useRunPolling(runId) {
    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const timeoutRef = useRef(null);
    useEffect(() => {
        if (!runId) {
            setRun(null);
            setIsPolling(false);
            return;
        }
        let cancelled = false;
        async function poll() {
            if (cancelled)
                return;
            setLoading(true);
            try {
                const updatedRun = await apiClient.getRun(runId);
                if (cancelled)
                    return;
                setRun(updatedRun);
                setError(null);
                // Continue polling if not in terminal state
                if (!TERMINAL_STATUSES.includes(updatedRun.status)) {
                    setIsPolling(true);
                    timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
                }
                else {
                    setIsPolling(false);
                }
            }
            catch (err) {
                if (cancelled)
                    return;
                setError(err instanceof Error ? err : new Error("Failed to fetch run"));
                setIsPolling(false);
            }
            finally {
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
/**
 * Hook to list runs for an organization
 */
export function useRuns(orgId = DEFAULT_ORG_ID, limit) {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error("Failed to fetch runs"));
                }
            }
            finally {
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
