/**
 * Sprint Repository - In-Memory Implementation
 *
 * Mirrors the eval-run repository but scoped to SprintResults. Sprint runs are
 * intentionally kept separate from eval runs so the two surfaces don't pollute
 * each other's histories on the dashboard.
 */

import { randomUUID } from "node:crypto";

import type { SprintResult, SprintResultStatus } from "../domain/entities/sprint-result.js";

export interface ISprintRepository {
  save(run: SprintResult): Promise<SprintResult>;
  findById(id: string): Promise<SprintResult | null>;
  listByContract(contractId: string, limit: number): Promise<SprintResult[]>;
  listRecent(limit: number): Promise<SprintResult[]>;
  findLatestByContract(contractId: string): Promise<SprintResult | null>;
}

export class InMemorySprintRepository implements ISprintRepository {
  private readonly runs = new Map<string, SprintResult>();

  async save(run: SprintResult): Promise<SprintResult> {
    this.runs.set(run.id, run);
    return run;
  }

  async findById(id: string): Promise<SprintResult | null> {
    return this.runs.get(id) ?? null;
  }

  async listByContract(contractId: string, limit: number): Promise<SprintResult[]> {
    return [...this.runs.values()]
      .filter((r) => r.contractId === contractId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async listRecent(limit: number): Promise<SprintResult[]> {
    return [...this.runs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async findLatestByContract(contractId: string): Promise<SprintResult | null> {
    const matches = [...this.runs.values()]
      .filter((r) => r.contractId === contractId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return matches[0] ?? null;
  }

  /** Test helper. */
  reset(): void {
    this.runs.clear();
  }
}

export function createInMemorySprintRepository(): ISprintRepository {
  return new InMemorySprintRepository();
}

export function newSprintRunId(): string {
  return randomUUID();
}

export function deriveSprintStatusFromIterations(
  iterations: { taskResult: { passed: boolean; score: number } }[],
  plateauDetectedOnLast: boolean,
  hitMaxIterations: boolean,
): SprintResultStatus {
  if (iterations.length === 0) return "errored";
  if (iterations.some((i) => i.taskResult.passed)) return "succeeded";
  if (plateauDetectedOnLast) return "plateau";
  if (hitMaxIterations) return "max-iterations";
  return "failed";
}
