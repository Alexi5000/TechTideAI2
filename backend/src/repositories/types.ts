/**
 * Repository Layer Types
 *
 * Re-exports domain types for backward compatibility.
 * Keeps infrastructure-specific types (DB schemas) in this layer.
 */

// Re-export domain types for backward compatibility
export type {
  Run,
  RunEvent,
  RunStatus,
  CreateRunInput,
} from "../domain/entities/run.js";

export interface UpdateRunStatusInput {
  status: RunStatus;
  output?: Record<string, unknown> | undefined;
  error?: string | undefined;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
}

/**
 * Run Repository Interface
 *
 * Abstracts database access for run management. Implementation may use
 * Supabase, PostgreSQL directly, or in-memory storage for testing.
 */
export interface IRunRepository {
  create(input: CreateRunInput): Promise<Run>;
  findById(id: string): Promise<Run | null>;
  findByOrgId(orgId: string, limit?: number): Promise<Run[]>;
  updateStatus(id: string, updates: UpdateRunStatusInput): Promise<Run>;
  addEvent(
    runId: string,
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<RunEvent>;
}

/**
 * Database row types (snake_case as stored in Supabase)
 * Used internally by repository implementations for type-safe DB queries.
 */
export interface DbRun {
  id: string;
  org_id: string;
  agent_id: string | null;
  status: RunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRunEvent {
  id: string;
  run_id: string;
  org_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
