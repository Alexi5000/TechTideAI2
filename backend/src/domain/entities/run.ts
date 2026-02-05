/**
 * Run Entity - Domain Core
 *
 * Pure domain representation of an agent run. No infrastructure dependencies.
 * This is the canonical definition of what a Run IS in the business domain.
 */

export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface Run {
  readonly id: string;
  readonly orgId: string;
  readonly agentId: string | null;
  readonly status: RunStatus;
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown> | null;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RunEvent {
  readonly id: string;
  readonly runId: string;
  readonly orgId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}

export interface CreateRunInput {
  readonly orgId: string;
  readonly agentId: string;
  readonly input: Record<string, unknown>;
}
