/**
 * Agent Hooks
 *
 * React hooks for fetching and managing agent data.
 */
import { type Agent, type AgentRegistry } from "../lib/api-client";
interface UseAgentsResult {
    registry: AgentRegistry | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Fetches the full agent registry (CEO, orchestrators, workers)
 */
export declare function useAgents(): UseAgentsResult;
interface UseAgentResult {
    agent: Agent | null;
    loading: boolean;
    error: Error | null;
    notFound: boolean;
}
/**
 * Fetches a specific agent by ID
 */
export declare function useAgent(id: string | undefined): UseAgentResult;
export {};
