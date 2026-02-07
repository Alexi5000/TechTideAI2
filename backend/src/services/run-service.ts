/**
 * Run Service - Application Layer
 *
 * Business logic for run lifecycle management. This service orchestrates
 * repository operations without knowing about HTTP or database details.
 */

import type { IRunRepository, UpdateRunStatusInput } from "../repositories/types.js";
import type { Run, RunEvent, CreateRunInput, RunStatus } from "../domain/index.js";
import {
  defaultStatusTransitionPolicy,
  RunNotFoundError,
  InvalidStatusTransitionError,
  type StatusTransitionPolicy,
} from "../domain/index.js";

export interface IRunService {
  createRun(input: CreateRunInput): Promise<Run>;
  getRun(id: string): Promise<Run | null>;
  listRuns(orgId: string, limit?: number): Promise<Run[]>;
  startRun(id: string): Promise<Run>;
  completeRun(id: string, output: Record<string, unknown>): Promise<Run>;
  failRun(id: string, error: string): Promise<Run>;
  cancelRun(id: string): Promise<Run>;
  addRunEvent(
    runId: string,
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<RunEvent>;
  listRunEvents(runId: string): Promise<RunEvent[]>;
}

export interface RunServiceOptions {
  transitionPolicy?: StatusTransitionPolicy;
}

export function createRunService(
  repository: IRunRepository,
  options: RunServiceOptions = {},
): IRunService {
  const transitionPolicy = options.transitionPolicy ?? defaultStatusTransitionPolicy;

  async function transitionStatus(
    id: string,
    targetStatus: RunStatus,
    updateOptions: {
      output?: Record<string, unknown>;
      error?: string;
    } = {},
  ): Promise<Run> {
    const run = await repository.findById(id);

    if (!run) {
      throw new RunNotFoundError(id);
    }

    // Use domain policy for validation (OCP compliant)
    if (!transitionPolicy.canTransition(run.status, targetStatus)) {
      throw new InvalidStatusTransitionError(run.status, targetStatus);
    }

    const now = new Date().toISOString();
    const updates: UpdateRunStatusInput = { status: targetStatus };

    if (targetStatus === "running") {
      updates.startedAt = now;
    }

    if (
      targetStatus === "succeeded" ||
      targetStatus === "failed" ||
      targetStatus === "canceled"
    ) {
      updates.finishedAt = now;
    }

    if (updateOptions.output !== undefined) {
      updates.output = updateOptions.output;
    }

    if (updateOptions.error !== undefined) {
      updates.error = updateOptions.error;
    }

    return repository.updateStatus(id, updates);
  }

  return {
    async createRun(input: CreateRunInput): Promise<Run> {
      return repository.create(input);
    },

    async getRun(id: string): Promise<Run | null> {
      return repository.findById(id);
    },

    async listRuns(orgId: string, limit = 50): Promise<Run[]> {
      return repository.findByOrgId(orgId, limit);
    },

    async startRun(id: string): Promise<Run> {
      return transitionStatus(id, "running");
    },

    async completeRun(id: string, output: Record<string, unknown>): Promise<Run> {
      return transitionStatus(id, "succeeded", { output });
    },

    async failRun(id: string, error: string): Promise<Run> {
      return transitionStatus(id, "failed", { error });
    },

    async cancelRun(id: string): Promise<Run> {
      return transitionStatus(id, "canceled");
    },

    async addRunEvent(
      runId: string,
      orgId: string,
      eventType: string,
      payload: Record<string, unknown>,
    ): Promise<RunEvent> {
      return repository.addEvent(runId, orgId, eventType, payload);
    },

    async listRunEvents(runId: string): Promise<RunEvent[]> {
      const run = await repository.findById(runId);
      if (!run) {
        throw new RunNotFoundError(runId);
      }
      return repository.listEvents(runId);
    },
  };
}
