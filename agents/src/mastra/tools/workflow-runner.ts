/**
 * Workflow Runner Tool
 *
 * Execute approved automation workflows and report results.
 * MVP implementation queues workflows for future execution.
 * Future: integrate with actual workflow engine.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// MVP: Simple workflow registry for demonstration
const WORKFLOW_REGISTRY: Record<
  string,
  {
    name: string;
    description: string;
    requiredInputs: string[];
    estimatedDurationMs: number;
  }
> = {
  "data-sync": {
    name: "Data Synchronization",
    description: "Sync data between systems and update dashboards",
    requiredInputs: ["sourceSystem", "targetSystem"],
    estimatedDurationMs: 30000,
  },
  "report-generation": {
    name: "Report Generation",
    description: "Generate and distribute scheduled reports",
    requiredInputs: ["reportType", "recipients"],
    estimatedDurationMs: 60000,
  },
  "health-check": {
    name: "System Health Check",
    description: "Run comprehensive health checks across all services",
    requiredInputs: [],
    estimatedDurationMs: 15000,
  },
  "deployment": {
    name: "Deployment Pipeline",
    description: "Deploy application updates through staging to production",
    requiredInputs: ["version", "environment"],
    estimatedDurationMs: 300000,
  },
  "backup": {
    name: "Data Backup",
    description: "Create and verify data backups",
    requiredInputs: ["scope"],
    estimatedDurationMs: 120000,
  },
};

export const workflowRunnerTool = createTool({
  id: "workflow-runner",
  description:
    "Execute approved automation workflows. Validates inputs, queues the workflow, and returns execution status.",

  inputSchema: z.object({
    workflowId: z
      .string()
      .describe("ID of the workflow to execute (e.g., 'data-sync', 'report-generation')"),
    input: z
      .record(z.unknown())
      .default({})
      .describe("Input parameters for the workflow"),
    dryRun: z
      .boolean()
      .default(false)
      .describe("If true, validates without executing"),
  }),

  outputSchema: z.object({
    workflowId: z.string(),
    workflowName: z.string(),
    status: z.enum(["queued", "validated", "rejected"]),
    runId: z.string().optional(),
    message: z.string(),
    estimatedDurationMs: z.number().optional(),
    validationErrors: z.array(z.string()).optional(),
  }),

  execute: async (params) => {
    const { workflowId, input = {}, dryRun = false } = params;

    // Check if workflow exists
    const workflow = WORKFLOW_REGISTRY[workflowId];
    if (!workflow) {
      const availableWorkflows = Object.keys(WORKFLOW_REGISTRY).join(", ");
      return {
        workflowId,
        workflowName: "Unknown",
        status: "rejected" as const,
        message: `Workflow not found: ${workflowId}. Available workflows: ${availableWorkflows}`,
        validationErrors: [`Unknown workflow ID: ${workflowId}`],
      };
    }

    // Validate required inputs
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
        message: `Workflow validation failed: ${validationErrors.length} error(s)`,
        validationErrors,
      };
    }

    // Dry run - just validate
    if (dryRun) {
      return {
        workflowId,
        workflowName: workflow.name,
        status: "validated" as const,
        message: `Workflow "${workflow.name}" validated successfully. Ready for execution.`,
        estimatedDurationMs: workflow.estimatedDurationMs,
      };
    }

    // MVP: Queue the workflow (actual execution would happen asynchronously)
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      workflowId,
      workflowName: workflow.name,
      status: "queued" as const,
      runId,
      message: `Workflow "${workflow.name}" queued for execution. Run ID: ${runId}`,
      estimatedDurationMs: workflow.estimatedDurationMs,
    };
  },
});
