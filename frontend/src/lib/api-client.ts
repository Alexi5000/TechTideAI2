/**
 * API Client
 *
 * Typed client for communicating with the TechTideAI backend.
 * All API calls go through this module for consistency.
 */

const API_BASE = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:4050";

export type AgentTier = "ceo" | "orchestrator" | "worker";

export interface Agent {
  id: string;
  name: string;
  tier: AgentTier;
  reportsTo?: string;
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

export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

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

export interface KnowledgeDocument {
  id: string;
  orgId: string;
  title: string;
  source: string;
  collection: string | null;
  content: string;
  metadata: Record<string, unknown>;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeIndexResult {
  document: KnowledgeDocument;
  chunkCount: number;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  title: string;
  source: string;
  collection: string | null;
  content: string;
  chunkIndex: number;
  distance: number | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new ApiError(response.status, error.message ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  /**
   * Get all agents from the registry
   */
  async getAgents(): Promise<AgentRegistry> {
    const response = await fetch(`${API_BASE}/api/agents`);
    return handleResponse<AgentRegistry>(response);
  },

  /**
   * Get a specific agent by ID
   */
  async getAgent(id: string): Promise<Agent> {
    const response = await fetch(`${API_BASE}/api/agents/${id}`);
    return handleResponse<Agent>(response);
  },

  /**
   * Trigger an agent run
   */
  async runAgent(
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<Run> {
    const response = await fetch(`${API_BASE}/api/agents/${agentId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    return handleResponse<Run>(response);
  },

  /**
   * List runs for an organization
   */
  async getRuns(orgId: string, limit?: number): Promise<Run[]> {
    const params = new URLSearchParams({ orgId });
    if (limit !== undefined) {
      params.set("limit", String(limit));
    }
    const response = await fetch(`${API_BASE}/api/runs?${params}`);
    return handleResponse<Run[]>(response);
  },

  /**
   * Get a specific run by ID
   */
  async getRun(id: string): Promise<Run> {
    const response = await fetch(`${API_BASE}/api/runs/${id}`);
    return handleResponse<Run>(response);
  },

  /**
   * Cancel a run
   */
  async cancelRun(id: string): Promise<Run> {
    const response = await fetch(`${API_BASE}/api/runs/${id}/cancel`, {
      method: "POST",
    });
    return handleResponse<Run>(response);
  },

  /**
   * Index a knowledge document
   */
  async indexKnowledgeDocument(input: {
    orgId?: string;
    title: string;
    source: string;
    collection?: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<KnowledgeIndexResult> {
    const response = await fetch(`${API_BASE}/api/knowledge/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<KnowledgeIndexResult>(response);
  },

  /**
   * Search knowledge chunks
   */
  async searchKnowledge(input: {
    orgId?: string;
    query: string;
    limit?: number;
    collections?: string[];
  }): Promise<{ results: KnowledgeSearchResult[] }> {
    const response = await fetch(`${API_BASE}/api/knowledge/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<{ results: KnowledgeSearchResult[] }>(response);
  },
};
