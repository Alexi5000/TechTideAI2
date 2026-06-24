/**
 * Run Service - Application Layer
 *
 * Business logic for run lifecycle management. This service orchestrates
 * repository operations without knowing about HTTP or database details.
 *
 * Phase 2.1: every state transition now writes a structured RunEvent so the
 * evidence plane (audit log, dashboards, post-mortems) has a complete record.
 */

import { randomUUID } from "node:crypto";

import type { IRunRepository, UpdateRunStatusInput } from "../repositories/types.js";
import type { Run, RunEvent, CreateRunInput, RunStatus } from "../domain/index.js";
import {
  defaultStatusTransitionPolicy,
  RunNotFoundError,
  InvalidStatusTransitionError,
  type StatusTransitionPolicy,
} from "../domain/index.js";
import type { RunEventType, RunEventSeverity } from "../domain/entities/run-event.js";

export interface IRunService {
  createRun(input: CreateRunInput, opts?: { correlationId?: string }): Promise<Run>;
  getRun(id: string): Promise<Run | null>;
  listRuns(orgId: string, limit?: number): Promise<Run[]>;
  startRun(id: string, opts?: { correlationId?: string }): Promise<Run>;
  completeRun(id: string, output: Record<string, unknown>, opts?: { correlationId?: string }): Promise<Run>;
  failRun(id: string, error: string, opts?: { correlationId?: string; severity?: RunEventSeverity }): Promise<Run>;
  cancelRun(id: string, opts?: { correlationId?: string }): Promise<Run>;
  awaitApproval(id: string, approvalId: string, opts?: { correlationId?: string }): Promise<Run>;
  addRunEvent(
    runId: string,
    orgId: string,
    eventType: RunEventType,
    payload: Record<string, unknown>,
    opts?: { correlationId?: string; severity?: RunEventSeverity },
  ): Promise<RunEvent>;
}

export interface RunServiceOptions {
  transitionPolicy?: StatusTransitionPolicy;
}

const STATUS_TO_EVENT: Record<RunStatus, RunEventType> = {
  queued: "run.created",
  running: "run.started",
  succeeded: "run.completed",
  failed: "run.failed",
  canceled: "run.canceled",
};

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
      severity?: RunEventSeverity;
      correlationId?: string | undefined;
    } = {},
  ): Promise<Run> {
    const run = await repository.findById(id);

    if (!run) {
      throw new RunNotFoundError(id);
    }

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

    const updated = await repository.updateStatus(id, updates);

    // Phase 2.1, emit a structured evidence-plane event for every transition.
    await repository.addEvent(
      updated.id,
      updated.orgId,
      STATUS_TO_EVENT[targetStatus],
      {
        fromStatus: run.status,
        toStatus: targetStatus,
        ...(updateOptions.error !== undefined ? { error: updateOptions.error } : {}),
      },
    );

    return updated;
  }

  function newCorrelationId(): string {
    return randomUUID();
  }

  return {
    async createRun(input: CreateRunInput, opts?: { correlationId?: string }): Promise<Run> {
      const run = await repository.create(input);
      await repository.addEvent(
        run.id,
        run.orgId,
        "run.created",
        { agentId: run.agentId, input: run.input },
        { correlationId: opts?.correlationId ?? newCorrelationId() },
      );
      return run;
    },

    async getRun(id: string): Promise<Run | null> {
      return repository.findById(id);
    },

    async listRuns(orgId: string, limit = 50): Promise<Run[]> {
      return repository.findByOrgId(orgId, limit);
    },

    async startRun(id: string, opts?: { correlationId?: string }): Promise<Run> {
      return transitionStatus(id, "running", { correlationId: opts?.correlationId });
    },

    async completeRun(
      id: string,
      output: Record<string, unknown>,
      opts?: { correlationId?: string },
    ): Promise<Run> {
      return transitionStatus(id, "succeeded", { output, correlationId: opts?.correlationId });
    },

    async failRun(
      id: string,
      error: string,
      opts?: { correlationId?: string; severity?: RunEventSeverity },
    ): Promise<Run> {
      return transitionStatus(id, "failed", {
        error,
        severity: opts?.severity ?? "error",
        correlationId: opts?.correlationId,
      });
    },

    async cancelRun(id: string, opts?: { correlationId?: string }): Promise<Run> {
      return transitionStatus(id, "canceled", { correlationId: opts?.correlationId });
    },

    async awaitApproval(
      id: string,
      approvalId: string,
      opts?: { correlationId?: string },
    ): Promise<Run> {
      const run = await repository.findById(id);
      if (!run) throw new RunNotFoundError(id);
      // Awaiting-approval is a non-terminal pause state; it does not currently
      // appear in the default policy. The transition is performed by mutating
      // `runs` directly through a future repository method. For now we record
      // the event so the queue and dashboards stay in sync.
      await repository.addEvent(
        run.id,
        run.orgId,
        "run.awaiting-approval",
        { approvalId },
        { correlationId: opts?.correlationId ?? newCorrelationId() },
      );
      return run;
    },

    async addRunEvent(
      runId: string,
      orgId: string,
      eventType: RunEventType,
      payload: Record<string, unknown>,
      opts?: { correlationId?: string; severity?: RunEventSeverity },
    ): Promise<RunEvent> {
      return repository.addEvent(
        runId,
        orgId,
        eventType,
        payload,
        {
          correlationId: opts?.correlationId ?? newCorrelationId(),
          severity: opts?.severity ?? "info",
        },
      );
    },
  };
}
