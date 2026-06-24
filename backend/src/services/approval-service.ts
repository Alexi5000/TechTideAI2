/**
 * Approval Service - Application Layer
 *
 * Orchestrates the approval gate:
 *   1. `request`, create an ApprovalRequest; returns it for the caller to
 *      pause the originating run.
 *   2. `grant` / `deny`, operator decision; flips status and records audit.
 *   3. `expireStale`, sweep job to mark expired requests.
 *
 * The service never resumes a run directly, that's the agent-execution
 * service's job once the approval is granted.
 */

import type { ApprovalRequest } from "../domain/index.js";
import {
  ApprovalAlreadyDecidedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
  type ApprovalPolicy,
  defaultApprovalPolicy,
} from "../domain/index.js";
import type { IApprovalRepository, CreateApprovalInput } from "../repositories/approval-repository.js";

export interface ApprovalServiceDeps {
  repository: IApprovalRepository;
  policy?: ApprovalPolicy | undefined;
  policyVersion?: string | undefined;
  ttlSeconds?: number | undefined;
  clock?: (() => Date) | undefined;
}

export class ApprovalService {
  private readonly repo: IApprovalRepository;
  private readonly policy: ApprovalPolicy;
  private readonly policyVersion: string;
  private readonly ttlSeconds: number;
  private readonly clock: () => Date;

  constructor(deps: ApprovalServiceDeps) {
    this.repo = deps.repository;
    this.policy = deps.policy ?? defaultApprovalPolicy;
    this.policyVersion = deps.policyVersion ?? "approval-policy-v1";
    this.ttlSeconds = deps.ttlSeconds ?? 60 * 60 * 24; // 24h default
    this.clock = deps.clock ?? (() => new Date());
  }

  async request(input: Omit<CreateApprovalInput, "expiresAt" | "policyVersion">): Promise<ApprovalRequest> {
    const expiresAt = new Date(this.clock().getTime() + this.ttlSeconds * 1000).toISOString();
    return this.repo.create({
      ...input,
      expiresAt,
      policyVersion: this.policyVersion,
    });
  }

  async grant(id: string, decidedBy: string, rationale?: string): Promise<ApprovalRequest> {
    const approval = await this.repo.findById(id);
    if (!approval) throw new ApprovalNotFoundError(id);
    if (approval.status !== "pending") throw new ApprovalAlreadyDecidedError(id, approval.status);
    if (approval.expiresAt < this.clock().toISOString()) {
      // Best-effort: mark expired then re-throw.
      await this.repo.decide(id, { status: "denied", decidedBy: "system", rationale: "auto-expired at grant time" });
      throw new ApprovalExpiredError(id);
    }
    return this.repo.decide(id, { status: "granted", decidedBy, rationale: rationale ?? null });
  }

  async deny(id: string, decidedBy: string, rationale?: string): Promise<ApprovalRequest> {
    const approval = await this.repo.findById(id);
    if (!approval) throw new ApprovalNotFoundError(id);
    if (approval.status !== "pending") throw new ApprovalAlreadyDecidedError(id, approval.status);
    return this.repo.decide(id, { status: "denied", decidedBy, rationale: rationale ?? null });
  }

  async expireStale(): Promise<number> {
    return this.repo.expireStale(this.clock());
  }

  async list(opts?: { status?: ApprovalRequest["status"] | undefined; limit?: number | undefined }): Promise<ApprovalRequest[]> {
    return this.repo.list(opts ?? {});
  }

  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.repo.findById(id);
  }

  /** The policy used by this service, exposed for the execution gate. */
  getPolicy(): ApprovalPolicy {
    return this.policy;
  }

  /** Policy version stamped onto new approvals. */
  getPolicyVersion(): string {
    return this.policyVersion;
  }
}
