/**
 * Approval Repository - Persistence Layer
 *
 * Two implementations:
 * - In-memory (default): suitable for single-process backend and tests.
 * - Supabase: swappable behind the same interface for production.
 *
 * The interface is the contract; the implementation is the choice.
 */

import { randomUUID } from "node:crypto";

import type {
  ApprovalRequest,
  ApprovalStatus,
} from "../domain/index.js";

export interface CreateApprovalInput {
  orgId: string;
  runId: string;
  agentId: string;
  action: string;
  payload: Record<string, unknown>;
  riskTier: ApprovalRequest["riskTier"];
  expiresAt: string;
  policyVersion?: string;
}

export interface IApprovalRepository {
  create(input: CreateApprovalInput): Promise<ApprovalRequest>;
  findById(id: string): Promise<ApprovalRequest | null>;
  findByRunId(runId: string): Promise<ApprovalRequest[]>;
  list(opts: { status?: ApprovalStatus | undefined; limit?: number | undefined }): Promise<ApprovalRequest[]>;
  decide(
    id: string,
    decision: { status: Extract<ApprovalStatus, "granted" | "denied">; decidedBy: string; rationale: string | null },
  ): Promise<ApprovalRequest>;
  expireStale(now?: Date): Promise<number>;
}

export class InMemoryApprovalRepository implements IApprovalRepository {
  private readonly approvals = new Map<string, ApprovalRequest>();

  async create(input: CreateApprovalInput): Promise<ApprovalRequest> {
    const id = randomUUID();
    const approval: ApprovalRequest = {
      id,
      orgId: input.orgId,
      runId: input.runId,
      agentId: input.agentId,
      action: input.action,
      payload: input.payload,
      riskTier: input.riskTier,
      status: "pending",
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      decidedBy: null,
      rationale: null,
      expiresAt: input.expiresAt,
      policyVersion: input.policyVersion ?? "approval-policy-v1",
    };
    this.approvals.set(id, approval);
    return approval;
  }

  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.approvals.get(id) ?? null;
  }

  async findByRunId(runId: string): Promise<ApprovalRequest[]> {
    return [...this.approvals.values()].filter((a) => a.runId === runId);
  }

  async list(opts: { status?: ApprovalStatus; limit?: number }): Promise<ApprovalRequest[]> {
    const limit = opts.limit ?? 50;
    const sorted = [...this.approvals.values()].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    const filtered = opts.status ? sorted.filter((a) => a.status === opts.status) : sorted;
    return filtered.slice(0, limit);
  }

  async decide(
    id: string,
    decision: { status: Extract<ApprovalStatus, "granted" | "denied">; decidedBy: string; rationale: string | null },
  ): Promise<ApprovalRequest> {
    const approval = this.approvals.get(id);
    if (!approval) throw new Error(`Approval ${id} not found`);
    const updated: ApprovalRequest = {
      ...approval,
      status: decision.status,
      decidedAt: new Date().toISOString(),
      decidedBy: decision.decidedBy,
      rationale: decision.rationale,
    };
    this.approvals.set(id, updated);
    return updated;
  }

  async expireStale(now: Date = new Date()): Promise<number> {
    let count = 0;
    const cutoff = now.toISOString();
    for (const [id, approval] of this.approvals) {
      if (approval.status === "pending" && approval.expiresAt < cutoff) {
        this.approvals.set(id, { ...approval, status: "expired", decidedAt: cutoff });
        count += 1;
      }
    }
    return count;
  }

  /** Test helper. */
  reset(): void {
    this.approvals.clear();
  }
}

export function createInMemoryApprovalRepository(): IApprovalRepository {
  return new InMemoryApprovalRepository();
}
