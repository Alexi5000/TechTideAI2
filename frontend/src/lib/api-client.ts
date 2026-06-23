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

// ---- Eval surface (Phase 1) ----

export type ScorerKind =
  | "exact-match"
  | "regex"
  | "json-schema"
  | "llm-judge"
  | "rubric-weighted"
  | "four-axis-grader"
  | "plateau-scorer";

export type EvalRunStatus = "running" | "succeeded" | "failed" | "canceled";

export interface EvalSuiteSummary {
  id: string;
  version: string;
  taskCount: number;
}

export interface EvalRunSummary {
  suiteId: string;
  suiteVersion: string;
  passRate: number;
  meanScore: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: number;
  regressionDeltaPct: number | null;
}

export interface ScoringBreakdownMeta {
  axes?: Record<string, number>;
  thresholds?: Record<string, number>;
  weights?: Record<string, number>;
  failingAxes?: string[];
  plateauDetected?: boolean;
  rollingDelta?: number;
  bestSoFar?: number;
  latestScore?: number;
  samplesConsidered?: number;
  windowSize?: number;
  tolerance?: number;
  error?: string;
  [key: string]: unknown;
}

export interface ScoringBreakdown {
  scorer: ScorerKind;
  score: number;
  weight: number;
  passed: boolean;
  rationale: string;
  durationMs: number;
  meta?: ScoringBreakdownMeta;
}

export interface EvalTaskResult {
  taskId: string;
  agentId: string;
  agentOutput: unknown;
  score: number;
  passed: boolean;
  latencyMs: number;
  tokensUsed: number;
  estimatedCostUsd: number;
  scorers: ScoringBreakdown[];
  failureReason: string | null;
  observedAt: string;
}

export interface EvalRun {
  id: string;
  suiteId: string;
  suiteVersion: string;
  status: EvalRunStatus;
  startedAt: string;
  completedAt: string | null;
  baselineId: string | null;
  modelVersions: Record<string, string>;
  scorerVersions: Record<string, string>;
  taskResults: EvalTaskResult[];
  summary: EvalRunSummary | null;
  failureReason: string | null;
}

// ---- Approval gate (Phase 3) ----

export type ApprovalStatus = "pending" | "granted" | "denied" | "expired";
export type ApprovalRiskTier = "read" | "write" | "external" | "destructive" | "billing";

export interface ApprovalRequest {
  id: string;
  runId: string;
  agentId: string;
  action: string;
  payload: Record<string, unknown>;
  riskTier: ApprovalRiskTier;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  rationale: string | null;
  expiresAt: string;
}

// ---- Sprints (Phase 8) ----

export type SprintResultStatus =
  | "succeeded"
  | "failed"
  | "max-iterations"
  | "plateau"
  | "errored";

export interface SprintIteration {
  iteration: number;
  agentOutput: unknown;
  taskResult: EvalTaskResult;
  plateauDetected: boolean;
  rollingDelta: number;
}

export interface SprintResult {
  id: string;
  contractId: string;
  contractVersion: string;
  status: SprintResultStatus;
  iterations: SprintIteration[];
  bestIteration: number | null;
  bestScore: number;
  totalTokens: number;
  totalCostUsd: number;
  startedAt: string;
  completedAt: string;
  failureReason: string | null;
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

  /**
   * List available eval suites (Phase 1).
   */
  async getEvalSuites(): Promise<EvalSuiteSummary[]> {
    const response = await fetch(`${API_BASE}/api/evals/suites`);
    return handleResponse<EvalSuiteSummary[]>(response);
  },

  /**
   * List recent eval runs, optionally filtered by suite id.
   */
  async getEvalRuns(opts: { suite?: string; limit?: number } = {}): Promise<EvalRun[]> {
    const params = new URLSearchParams();
    if (opts.suite) params.set("suite", opts.suite);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/api/evals/runs${qs ? `?${qs}` : ""}`);
    return handleResponse<EvalRun[]>(response);
  },

  /**
   * Get one eval run by id.
   */
  async getEvalRun(id: string): Promise<EvalRun> {
    const response = await fetch(`${API_BASE}/api/evals/runs/${id}`);
    return handleResponse<EvalRun>(response);
  },

  /**
   * Trigger a new eval run. Returns the persisted EvalRun on completion.
   */
  async runEval(opts: { suite?: string; baseline?: string; concurrency?: number; judgeModel?: string } = {}): Promise<EvalRun> {
    const params = new URLSearchParams();
    if (opts.suite) params.set("suite", opts.suite);
    if (opts.baseline) params.set("baseline", opts.baseline);
    if (opts.concurrency) params.set("concurrency", String(opts.concurrency));
    if (opts.judgeModel) params.set("judgeModel", opts.judgeModel);
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/api/evals/run${qs ? `?${qs}` : ""}`, {
      method: "POST",
    });
    return handleResponse<EvalRun>(response);
  },

  /**
   * List approvals, optionally filtered by status (Phase 3).
   */
  async getApprovals(opts: { status?: "pending" | "granted" | "denied" | "expired"; limit?: number } = {}): Promise<ApprovalRequest[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/api/approvals${qs ? `?${qs}` : ""}`);
    return handleResponse<ApprovalRequest[]>(response);
  },

  /**
   * Grant an approval request.
   */
  async grantApproval(id: string, rationale?: string): Promise<ApprovalRequest> {
    const response = await fetch(`${API_BASE}/api/approvals/${id}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rationale: rationale ?? null }),
    });
    return handleResponse<ApprovalRequest>(response);
  },

  /**
   * Deny an approval request.
   */
  async denyApproval(id: string, rationale?: string): Promise<ApprovalRequest> {
    const response = await fetch(`${API_BASE}/api/approvals/${id}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rationale: rationale ?? null }),
    });
    return handleResponse<ApprovalRequest>(response);
  },

  /**
   * List recent sprint runs, optionally filtered by contract id.
   */
  async getSprints(opts: { contract?: string; limit?: number } = {}): Promise<SprintResult[]> {
    const params = new URLSearchParams();
    if (opts.contract) params.set("contract", opts.contract);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/api/sprints/runs${qs ? `?${qs}` : ""}`);
    return handleResponse<SprintResult[]>(response);
  },

  /**
   * Get a single sprint run by id.
   */
  async getSprint(id: string): Promise<SprintResult> {
    const response = await fetch(`${API_BASE}/api/sprints/runs/${id}`);
    return handleResponse<SprintResult>(response);
  },

  /**
   * Trigger a sprint run.
   */
  async runSprint(opts: { contract?: string; concurrency?: number } = {}): Promise<SprintResult> {
    const params = new URLSearchParams();
    if (opts.contract) params.set("contract", opts.contract);
    if (opts.concurrency) params.set("concurrency", String(opts.concurrency));
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/api/sprints/run${qs ? `?${qs}` : ""}`, {
      method: "POST",
    });
    return handleResponse<SprintResult>(response);
  },
};
