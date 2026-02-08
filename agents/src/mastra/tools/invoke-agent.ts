/**
 * Invoke-Agent Tool (Pattern #4: Orchestrator-Worker)
 *
 * Allows orchestrator agents to delegate tasks to their direct-report
 * worker agents. Uses a factory pattern for hierarchy enforcement:
 * each orchestrator gets a scoped instance with its allowed targets.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getAgentById } from "../../core/registry.js";

/**
 * Create an invoke-agent tool scoped to specific target agents.
 *
 * @param allowedTargetIds - Agent IDs this tool instance can invoke.
 *   CEO gets orchestrator IDs, orchestrators get their worker IDs,
 *   workers get none (tool removed entirely in the agent factory).
 */
export function createInvokeAgentTool(allowedTargetIds: string[]) {
  return createTool({
    id: "invoke-agent",
    description:
      "Invoke another agent to perform a subtask. " +
      "Use this to delegate work to agents in your team. " +
      `Allowed targets: ${allowedTargetIds.join(", ") || "none"}.`,

    inputSchema: z.object({
      agentId: z.string().describe("ID of the agent to invoke"),
      input: z.record(z.unknown()).default({}).describe("Input to pass to the agent"),
    }),

    outputSchema: z.object({
      agentId: z.string(),
      success: z.boolean(),
      output: z.record(z.unknown()),
      error: z.string().optional(),
    }),

    execute: async (params) => {
      const { agentId, input } = params;

      // Hard enforcement: reject if target is not in allowed list
      if (!allowedTargetIds.includes(agentId)) {
        return {
          agentId,
          success: false,
          output: {},
          error: `Cannot invoke "${agentId}". Allowed targets: ${allowedTargetIds.join(", ") || "none"}`,
        };
      }

      // Validate agent exists in the registry
      const agentDef = getAgentById(agentId);
      if (!agentDef) {
        return {
          agentId,
          success: false,
          output: {},
          error: `Agent not found in registry: ${agentId}`,
        };
      }

      try {
        // Lazy import to avoid circular dependency:
        // tool-registry.ts → tools/index.ts → invoke-agent.ts → agents.ts → tool-registry.ts
        const { mastraAgents } = await import("../agents.js");
        const agent = mastraAgents[agentId];

        if (!agent) {
          return {
            agentId,
            success: false,
            output: {},
            error: `Agent runtime not initialized: ${agentId}`,
          };
        }

        const resolvedInput = input ?? {};
        const prompt =
          typeof resolvedInput["prompt"] === "string"
            ? resolvedInput["prompt"]
            : JSON.stringify(resolvedInput);

        const result = await agent.generate([{ role: "user", content: prompt }]);

        return {
          agentId,
          success: true,
          output: { text: result.text ?? "" },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          agentId,
          success: false,
          output: {},
          error: errorMessage,
        };
      }
    },
  });
}

/**
 * Base invoke-agent tool for the shared tools registry.
 * This unrestricted instance satisfies the tool-registry validation.
 * In practice, createMastraAgents() overrides it with a scoped
 * instance per agent based on hierarchy.
 */
export const invokeAgentTool = createInvokeAgentTool([]);
