import { describe, expect, it } from "vitest";

import {
  ApprovalAlreadyDecidedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
} from "../domain/index.js";
import { createInMemoryApprovalRepository } from "../repositories/approval-repository.js";
import { ApprovalService } from "./approval-service.js";

function makeService(opts?: { ttlSeconds?: number; clock?: () => Date }): ApprovalService {
  return new ApprovalService({
    repository: createInMemoryApprovalRepository(),
    ttlSeconds: opts?.ttlSeconds ?? 3600,
    clock: opts?.clock,
  });
}

describe("ApprovalService", () => {
  it("creates a pending approval with a future expiry", async () => {
    const svc = makeService();
    const approval = await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "issue_payment",
      payload: { amountUsd: 5000 },
      riskTier: "billing",
    });
    expect(approval.status).toBe("pending");
    expect(new Date(approval.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(approval.policyVersion).toMatch(/v1/);
  });

  it("grants and audits", async () => {
    const svc = makeService();
    const approval = await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "issue_payment",
      payload: { amountUsd: 5000 },
      riskTier: "billing",
    });
    const granted = await svc.grant(approval.id, "operator-1", "vendor verified");
    expect(granted.status).toBe("granted");
    expect(granted.decidedBy).toBe("operator-1");
    expect(granted.rationale).toBe("vendor verified");
  });

  it("denies and audits", async () => {
    const svc = makeService();
    const approval = await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "delete_customer_record",
      payload: {},
      riskTier: "destructive",
    });
    const denied = await svc.deny(approval.id, "operator-1", "not in scope");
    expect(denied.status).toBe("denied");
    expect(denied.rationale).toBe("not in scope");
  });

  it("rejects double-decision", async () => {
    const svc = makeService();
    const approval = await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "delete_customer_record",
      payload: {},
      riskTier: "destructive",
    });
    await svc.grant(approval.id, "operator-1");
    await expect(svc.grant(approval.id, "operator-2")).rejects.toBeInstanceOf(ApprovalAlreadyDecidedError);
    await expect(svc.deny(approval.id, "operator-2")).rejects.toBeInstanceOf(ApprovalAlreadyDecidedError);
  });

  it("throws NotFound on unknown id", async () => {
    const svc = makeService();
    await expect(svc.grant("00000000-0000-0000-0000-000000000999", "op")).rejects.toBeInstanceOf(ApprovalNotFoundError);
  });

  it("expires stale approvals on grant", async () => {
    let now = new Date("2026-01-01T00:00:00Z");
    const svc = makeService({
      ttlSeconds: 60,
      clock: () => new Date(now.getTime()),
    });
    const approval = await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "issue_payment",
      payload: {},
      riskTier: "billing",
    });
    now = new Date("2026-01-01T00:05:00Z"); // past TTL
    await expect(svc.grant(approval.id, "operator-1")).rejects.toBeInstanceOf(ApprovalExpiredError);
    const refreshed = await svc.findById(approval.id);
    expect(refreshed?.status).toBe("denied"); // auto-expired → marked denied
  });

  it("expireStale sweeps the buffer", async () => {
    let now = new Date("2026-01-01T00:00:00Z");
    const svc = makeService({ clock: () => new Date(now.getTime()), ttlSeconds: 60 });
    await svc.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      agentId: "orch-centaurus-a",
      action: "issue_payment",
      payload: {},
      riskTier: "billing",
    });
    now = new Date("2026-01-01T00:05:00Z");
    const swept = await svc.expireStale();
    expect(swept).toBe(1);
    const list = await svc.list({ status: "expired" });
    expect(list).toHaveLength(1);
  });
});
