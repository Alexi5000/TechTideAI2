/**
 * Run Hooks
 *
 * React hooks for managing agent runs with polling support.
 */
import { type Run } from "../lib/api-client";
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
export declare function useAgentRun(): UseAgentRunResult;
interface UseRunPollingResult {
    run: Run | null;
    loading: boolean;
    error: Error | null;
    isPolling: boolean;
}
/**
 * Hook to poll a run's status until it reaches a terminal state
 */
export declare function useRunPolling(runId: string | null): UseRunPollingResult;
interface UseRunsResult {
    runs: Run[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Hook to list runs for an organization
 */
export declare function useRuns(orgId?: string, limit?: number): UseRunsResult;
export {};
