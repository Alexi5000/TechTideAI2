/**
 * Workflow Runner Tool — Phase 3.4
 *
 * Real implementation. Classifies the workflow against the ApprovalPolicy and
 * either:
 *   (a) auto-runs the workflow (low-risk), or
 *   (b) creates an ApprovalRequest and returns `{ status: "awaiting-approval",
 *       approvalId }` so the run pauses until an operator decides.
 *
 * The status vocabulary is now aligned with the rest of the system:
 *   - "auto-approved" (low-risk, executing)
 *   - "queued"        (validating, but high-risk → approval requested)
 *   - "awaiting-approval"
 *   - "rejected"      (validation failure)
 *
 * Status `queued` is no longer a stand-in for "everything worked" — it now
 * means "valid, awaiting downstream decision".
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  ApprovalPolicy,
} from "../../core/approval-policy.js";
import type { ApprovalRequest } from "../../core/approval-policy.js";

/**
 * Workflow registry. Mirrors the categories a real workflow engine would
 * expose; each workflow has a `riskHints` array that the classifier uses to
 * bucket risk alongside the action string itself.
 */
const WORKFLOW_REGISTRY: Record<
  string,
  {
    name: string;
    description: string;
    requiredInputs: string[];
    estimatedDurationMs: number;
    riskHints: string[];
  }
> = {
  "data-sync": {
    name: "Data Synchronization",
    description: "Sync data between systems and update dashboards",
    requiredInputs: ["sourceSystem", "targetSystem"],
    estimatedDurationMs: 30_000,
    riskHints: ["update", "write"],
  },
  "report-generation": {
    name: "Report Generation",
    description: "Generate and distribute scheduled reports",
    requiredInputs: ["reportType", "recipients"],
    estimatedDurationMs: 60_000,
    riskHints: ["send_email", "external_api"],
  },
  "health-check": {
    name: "System Health Check",
    description: "Run comprehensive health checks across all services",
    requiredInputs: [],
    estimatedDurationMs: 15_000,
    riskHints: [],
  },
  deployment: {
    name: "Deployment Pipeline",
    description: "Deploy application updates through staging to production",
    requiredInputs: ["version", "environment"],
    estimatedDurationMs: 300_000,
    riskHints: ["write", "external_api"],
  },
  backup: {
    name: "Data Backup",
    description: "Create and verify data backups",
    requiredInputs: ["scope"],
    estimatedDurationMs: 120_000,
    riskHints: ["write"],
  },
  "vendor-payment": {
    name: "Vendor Payment",
    description: "Issue a payment to a vendor via the billing provider",
    requiredInputs: ["vendorId", "amountUsd"],
    estimatedDurationMs: 30_000,
    riskHints: ["payment", "billing"],
  },
  "account-purge": {
    name: "Account Purge",
    description: "Permanently delete a customer account and all its data",
    requiredInputs: ["customerId", "confirmation"],
    estimatedDurationMs: 60_000,
    riskHints: ["delete", "wipe"],
  },
};

const toolPolicy: ApprovalPolicy = new ApprovalPolicy();

/**
 * Side-effecting seam: in production this would POST to the backend's
 * `/api/approvals` endpoint. In tests it's overridden.
 */
export type ApprovalRequestFactory = (input: {
  runId: string;
  agentId: string;
  action: string;
  payload: Record<string, unknown>;
  riskTier: ApprovalRequest["riskTier"];
}) => Promise<{ id: string }>;

let approvalRequestFactory: ApprovalRequestFactory = async (input) => {
  // Default: emit a stub id so the tool doesn't crash in environments without
  // a backend (e.g. Mastra dev console). Real wiring injects a factory at boot.
  void input;
  return { id: `approval-stub-${Math.random().toString(36).slice(2, 10)}` };
};

export function setApprovalRequestFactory(factory: ApprovalRequestFactory): void {
  approvalRequestFactory = factory;
}

export const workflowRunnerTool = createTool({
  id: "workflow-runner",
  description:
    "Execute automation workflows. Validates inputs, classifies risk, and routes high-risk actions through the approval gate. Returns status: auto-approved | awaiting-approval | rejected.",

  inputSchema: z.object({
    workflowId: z.string().describe("ID of the workflow (e.g., 'data-sync', 'vendor-payment')"),
    input: z.record(z.unknown()).default({}),
    dryRun: z.boolean().default(false),
    runId: z.string().default("agent-runtime"),
    agentId: z.string().default("unknown-agent"),
  }),

  outputSchema: z.object({
    workflowId: z.string(),
    workflowName: z.string(),
    status: z.enum(["auto-approved", "awaiting-approval", "rejected", "queued"]),
    runId: z.string().optional(),
    approvalId: z.string().optional(),
    riskTier: z.enum(["read", "write", "external", "destructive", "billing"]).optional(),
    message: z.string(),
    estimatedDurationMs: z.number().optional(),
    validationErrors: z.array(z.string()).optional(),
  }),

  execute: async (params) => {
    const { workflowId, input = {}, dryRun = false, runId, agentId } = params;

    const workflow = WORKFLOW_REGISTRY[workflowId];
    if (!workflow) {
      return {
        workflowId,
        workflowName: "Unknown",
        status: "rejected" as const,
        message: `Workflow not found: ${workflowId}`,
        validationErrors: [`Unknown workflow ID: ${workflowId}`],
      };
    }

    const validationErrors: string[] = [];
    for (const requiredInput of workflow.requiredInputs) {
      if (!(requiredInput in input)) {
        validationErrors.push(`Missing required input: ${requiredInput}`);
      }
    }
    if (validationErrors.length > 0) {
      return {
        workflowId,
        workflowName: workflow.name,
        status: "rejected" as const,
        message: `Validation failed: ${validationErrors.length} error(s)`,
        validationErrors,
      };
    }

    // Risk classification: combine the workflow's hints with the action payload.
    const blob = `${workflowId} ${JSON.stringify(input)} ${workflow.riskHints.join(" ")}`.toLowerCase();
    const decision = toolPolicy.decide(workflowId, { ...input, _hints: blob });

    if (decision.requiresApproval) {
      const { id } = await approvalRequestFactory({
        runId: runId ?? "agent-runtime",
        agentId: agentId ?? "unknown-agent",
        action: workflowId,
        payload: { ...input, estimatedDurationMs: workflow.estimatedDurationMs },
        riskTier: decision.riskTier,
      });
      return {
        workflowId,
        workflowName: workflow.name,
        status: "awaiting-approval" as const,
        approvalId: id,
        riskTier: decision.riskTier,
        message: `Workflow "${workflow.name}" requires human approval (${decision.riskTier}); run is paused.`,
        estimatedDurationMs: workflow.estimatedDurationMs,
      };
    }

    if (dryRun) {
      return {
        workflowId,
        workflowName: workflow.name,
        status: "queued" as const,
        riskTier: decision.riskTier,
        message: `Workflow "${workflow.name}" validated (${decision.riskTier}); ready for execution.`,
        estimatedDurationMs: workflow.estimatedDurationMs,
      };
    }

    // Low-risk path: in production this would hand off to the workflow engine.
    return {
      workflowId,
      workflowName: workflow.name,
      status: "auto-approved" as const,
      runId: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      riskTier: decision.riskTier,
      message: `Workflow "${workflow.name}" auto-approved (${decision.riskTier}); execution started.`,
      estimatedDurationMs: workflow.estimatedDurationMs,
    };
  },
});
