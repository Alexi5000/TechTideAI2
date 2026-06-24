/**
 * Eval Run Repository - In-Memory Implementation
 *
 * The harness persists eval runs to a structured surface so the dashboard can
 * list them and the CLI can compare against a baseline. Supabase is the long-term
 * store (see `createSupabaseEvalRunRepository` in eval-run-repository.supabase.ts,
 * added in a follow-up when the Supabase tables are populated). The in-memory
 * repository is the default for now because it keeps the harness runnable in
 * CI without a live database.
 *
 * The interface is the contract; the implementation is swappable.
 */

import { randomUUID } from "node:crypto";

import type { EvalRun } from "../domain/entities/eval-run.js";

export interface IEvalRunRepository {
  save(run: EvalRun): Promise<EvalRun>;
  findById(id: string): Promise<EvalRun | null>;
  listRecent(limit: number): Promise<EvalRun[]>;
  listBySuite(suiteId: string, limit: number): Promise<EvalRun[]>;
  /** Returns the most recent `EvalRun` for a suite, used as a baseline. */
  findLatestBySuite(suiteId: string): Promise<EvalRun | null>;
}

export class InMemoryEvalRunRepository implements IEvalRunRepository {
  private readonly runs = new Map<string, EvalRun>();

  async save(run: EvalRun): Promise<EvalRun> {
    this.runs.set(run.id, run);
    return run;
  }

  async findById(id: string): Promise<EvalRun | null> {
    return this.runs.get(id) ?? null;
  }

  async listRecent(limit: number): Promise<EvalRun[]> {
    return [...this.runs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async listBySuite(suiteId: string, limit: number): Promise<EvalRun[]> {
    return [...this.runs.values()]
      .filter((r) => r.suiteId === suiteId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async findLatestBySuite(suiteId: string): Promise<EvalRun | null> {
    const filtered = [...this.runs.values()]
      .filter((r) => r.suiteId === suiteId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return filtered[0] ?? null;
  }

  /** Test helper. */
  reset(): void {
    this.runs.clear();
  }
}

export function createInMemoryEvalRunRepository(): IEvalRunRepository {
  return new InMemoryEvalRunRepository();
}

export function newEvalRunId(): string {
  return randomUUID();
}
