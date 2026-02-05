/**
 * API Client
 *
 * Typed client for communicating with the TechTideAI backend.
 * All API calls go through this module for consistency.
 */
export type AgentTier = "ceo" | "orchestrator" | "worker";
export interface Agent {
    id: string;
    name: string;
    tier: AgentTier;
    domain: string;
    mission: string;
    responsibilities: string[];
    outputs: string[];
    tools: string[];
    metrics: string[];
}
export interface AgentRegistry {
    ceo: Agent;
    orchestrators: Agent[];
    workers: Agent[];
}
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export interface Run {
    id: string;
    orgId: string;
    agentId: string | null;
    status: RunStatus;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare const apiClient: {
    /**
     * Get all agents from the registry
     */
    getAgents(): Promise<AgentRegistry>;
    /**
     * Get a specific agent by ID
     */
    getAgent(id: string): Promise<Agent>;
    /**
     * Trigger an agent run
     */
    runAgent(agentId: string, input: Record<string, unknown>): Promise<Run>;
    /**
     * List runs for an organization
     */
    getRuns(orgId: string, limit?: number): Promise<Run[]>;
    /**
     * Get a specific run by ID
     */
    getRun(id: string): Promise<Run>;
    /**
     * Cancel a run
     */
    cancelRun(id: string): Promise<Run>;
};
