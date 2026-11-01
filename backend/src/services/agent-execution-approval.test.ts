import { describe, expect, it, vi } from "vitest";
import { createInMemoryApprovalRepository } from "../repositories/approval-repository.js";
import { ApprovalService } from "./approval-service.js";
import { createAgentExecutionService } from "./agent-execution-service.js";
import type { IRunService } from "./run-service.js";
import type { IAgentRuntime } from "@techtide/agents";

describe("approval-gated execution", () => {
  it("does not resume a pending approval when the caller claims it was granted", async () => {
    const approvals = createInMemoryApprovalRepository();
    const approvalService = new ApprovalService({ repository: approvals });
    const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const approval = await approvalService.request({
      orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", runId,
      agentId: "agent", action: "external", payload: {}, riskTier: "external",
    });
    const startRun = vi.fn();
    const getRun = vi.fn().mockResolvedValue({ id: runId, agentId: "agent", input: {} });
    const runService = { getRun, startRun } as unknown as IRunService;
    const execute = vi.fn();
    const service = createAgentExecutionService({
      runService, approvalService, approvalRepository: approvals,
      agentRuntime: { execute } as unknown as IAgentRuntime,
      agentLookup: { exists: () => true },
    });
    await expect(service.resumeRunAfterApproval(runId, approval.id, "granted")).rejects.toThrow();
    expect(startRun).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not use a granted approval for a run in another organization", async () => {
    const approvals = createInMemoryApprovalRepository();
    const approvalService = new ApprovalService({ repository: approvals });
    const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const approval = await approvalService.request({
      orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", runId,
      agentId: "agent", action: "external", payload: {}, riskTier: "external",
    });
    await approvalService.grant(approval.id, "verified-admin");
    const startRun = vi.fn();
    const getRun = vi.fn().mockResolvedValue({ id: runId, orgId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", agentId: "agent", input: {} });
    const execute = vi.fn();
    const service = createAgentExecutionService({
      runService: { getRun, startRun } as unknown as IRunService,
      approvalService, approvalRepository: approvals,
      agentRuntime: { execute } as unknown as IAgentRuntime,
      agentLookup: { exists: () => true },
    });
    await expect(service.resumeRunAfterApproval(runId, approval.id, "granted")).rejects.toThrow("organization");
    expect(startRun).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("accepts a stored denial for a run in the same organization", async () => {
    const approvals = createInMemoryApprovalRepository();
    const approvalService = new ApprovalService({ repository: approvals });
    const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const orgId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const approval = await approvalService.request({orgId, runId, agentId:"agent", action:"external", payload:{}, riskTier:"external"});
    await approvalService.deny(approval.id, "verified-admin", "not approved");
    const failRun = vi.fn().mockResolvedValue({id:runId, orgId});
    const service = createAgentExecutionService({
      runService: {getRun:vi.fn().mockResolvedValue({id:runId, orgId}), failRun} as unknown as IRunService,
      approvalService, approvalRepository: approvals,
      agentRuntime: {execute:vi.fn()} as unknown as IAgentRuntime,
      agentLookup: {exists:() => true},
    });
    await service.resumeRunAfterApproval(runId, approval.id, "denied");
    expect(failRun).toHaveBeenCalledWith(runId, "Denied by operator: not approved");
  });
});
