/**
 * Agent Execution Service - Application Layer
 *
 * Orchestrates agent execution lifecycle. Owns the business logic for:
 * - Creating runs
 * - Classifying the action through the approval policy
 * - Pausing runs that need human approval
 * - Triggering async execution
 * - Updating run state based on results
 *
 * Phase 3 wiring: the service consults `ApprovalPolicy.classify(action, payload)`.
 * High-risk actions emit an ApprovalRequest and the run is held in a
 * "awaiting-approval" state. When the operator grants/denies via the approval
 * routes, `resumeRunAfterApproval` finishes the lifecycle.
 */

import type { IAgentRuntime, AgentRunResult } from "@techtide/agents";
import type { IRunService } from "./run-service.js";
import type { IApprovalRepository } from "../repositories/approval-repository.js";
import type { ApprovalService } from "./approval-service.js";
import type {
  ApprovalPolicy,
  ApprovalRequest,
} from "../domain/index.js";
import { defaultApprovalPolicy } from "../domain/index.js";
import type { Run } from "../domain/index.js";
import { AgentNotFoundError } from "../domain/index.js";

export interface AgentLookup {
  exists(agentId: string): boolean;
}

export interface ExecutionLogger {
  error(message: string): void;
  info(message: string): void;
}

export interface IAgentExecutionService {
  executeAgent(
    agentId: string,
    input: Record<string, unknown>,
    orgId: string,
  ): Promise<Run | (Run & { awaitingApproval: true; approvalId: string })>;
  resumeRunAfterApproval(
    runId: string,
    approvalId: string,
    decision: "granted" | "denied",
  ): Promise<Run>;
}

export interface AgentExecutionServiceDeps {
  runService: IRunService;
  approvalService: ApprovalService;
  approvalRepository: IApprovalRepository;
  agentRuntime: IAgentRuntime;
  agentLookup: AgentLookup;
  policy?: ApprovalPolicy;
  logger?: ExecutionLogger;
}

export function createAgentExecutionService(
  deps: AgentExecutionServiceDeps,
): IAgentExecutionService {
  const {
    runService,
    approvalService,
    approvalRepository,
    agentRuntime,
    agentLookup,
    logger,
  } = deps;
  const policy = deps.policy ?? defaultApprovalPolicy;

  async function classifyAndMaybeGate(
    runId: string,
    orgId: string,
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<{ gated: false } | { gated: true; approvalId: string; riskTier: ApprovalRequest["riskTier"] }> {
    // The action string is convention: agents pass `input.action` if they want
    // risk classification, else we fall back to a benign "agent.run".
    const action = typeof input["action"] === "string" ? (input["action"] as string) : "agent.run";
    const payload = (input["payload"] as Record<string, unknown> | undefined) ?? input;
    const decision = policy.decide(action, payload);
    if (!decision.requiresApproval) return { gated: false };

    const approval = await approvalService.request({
      orgId,
      runId,
      agentId,
      action,
      payload,
      riskTier: decision.riskTier,
    });
    await runService.awaitApproval(runId, approval.id);
    return { gated: true, approvalId: approval.id, riskTier: approval.riskTier };
  }

  async function handleExecutionResult(
    runId: string,
    result: AgentRunResult,
  ): Promise<void> {
    try {
      if (result.success) {
        await runService.completeRun(runId, result.output);
      } else {
        await runService.failRun(runId, result.error ?? "Agent execution failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger?.error(`Failed to update run ${runId} status: ${errorMessage}`);
    }
  }

  async function executeAsync(
    runId: string,
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    try {
      await runService.startRun(runId);
      const result = await agentRuntime.execute({ agentId, input });
      await handleExecutionResult(runId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      try {
        await runService.failRun(runId, errorMessage);
      } catch (_updateError) {
        logger?.error(`Failed to update run ${runId} status after error: ${errorMessage}`);
      }
    }
  }

  async function resumeAsync(
    runId: string,
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    // After approval we transition the run back to "running" then dispatch.
    await runService.startRun(runId);
    await executeAsync(runId, agentId, input);
  }

  return {
    async executeAgent(agentId, input, orgId): Promise<Run | (Run & { awaitingApproval: true; approvalId: string })> {
      if (!agentLookup.exists(agentId)) {
        throw new AgentNotFoundError(agentId);
      }

      const run = await runService.createRun({ orgId, agentId, input });

      const gate = await classifyAndMaybeGate(run.id, orgId, agentId, input);
      if (gate.gated) {
        logger?.info(`run ${run.id} paused awaiting approval ${gate.approvalId} (${gate.riskTier})`);
        return { ...run, awaitingApproval: true, approvalId: gate.approvalId };
      }

      setImmediate(() => {
        executeAsync(run.id, agentId, input).catch((error) => {
          logger?.error(`Unexpected error in async execution: ${error}`);
        });
      });

      return run;
    },

    async resumeRunAfterApproval(
      runId: string,
      approvalId: string,
      decision: "granted" | "denied",
    ): Promise<Run> {
      const approvals = await approvalRepository.findByRunId(runId);
      const approval = approvals.find((a) => a.id === approvalId);
      if (!approval) throw new Error(`Approval ${approvalId} not found for run ${runId}`);
      const run = await runService.getRun(runId);
      if (!run) throw new Error(`Run ${runId} not found`);

      if (decision === "denied") {
        return runService.failRun(runId, `Denied by operator: ${approval.rationale ?? ""}`.trim());
      }

      // Granted: re-dispatch the original input.
      await resumeAsync(runId, run.agentId ?? "unknown", run.input);
      return (await runService.getRun(runId))!;
    },
  };
}
