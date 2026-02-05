/**
 * API Client
 *
 * Typed client for communicating with the TechTideAI backend.
 * All API calls go through this module for consistency.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4050";
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new ApiError(response.status, error.message ?? `HTTP ${response.status}`);
    }
    return response.json();
}
export const apiClient = {
    /**
     * Get all agents from the registry
     */
    async getAgents() {
        const response = await fetch(`${API_BASE}/api/agents`);
        return handleResponse(response);
    },
    /**
     * Get a specific agent by ID
     */
    async getAgent(id) {
        const response = await fetch(`${API_BASE}/api/agents/${id}`);
        return handleResponse(response);
    },
    /**
     * Trigger an agent run
     */
    async runAgent(agentId, input) {
        const response = await fetch(`${API_BASE}/api/agents/${agentId}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input }),
        });
        return handleResponse(response);
    },
    /**
     * List runs for an organization
     */
    async getRuns(orgId, limit) {
        const params = new URLSearchParams({ orgId });
        if (limit !== undefined) {
            params.set("limit", String(limit));
        }
        const response = await fetch(`${API_BASE}/api/runs?${params}`);
        return handleResponse(response);
    },
    /**
     * Get a specific run by ID
     */
    async getRun(id) {
        const response = await fetch(`${API_BASE}/api/runs/${id}`);
        return handleResponse(response);
    },
    /**
     * Cancel a run
     */
    async cancelRun(id) {
        const response = await fetch(`${API_BASE}/api/runs/${id}/cancel`, {
            method: "POST",
        });
        return handleResponse(response);
    },
};
