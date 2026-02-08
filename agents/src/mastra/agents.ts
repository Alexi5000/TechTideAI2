import { Agent } from "@mastra/core/agent";
import type { ToolsInput } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { agentRegistry } from "../core/registry.js";
import { renderPrompt, type ToolPolicy } from "../core/prompts/index.js";
import { sharedTools, selectToolsForAgent } from "./tool-registry.js";
import { createInvokeAgentTool } from "./tools/invoke-agent.js";

const defaultModel = (process.env["MASTRA_MODEL"] ?? "openai/gpt-4o") as MastraModelConfig;
const defaultToolPolicy = resolveToolPolicy(process.env["MASTRA_TOOL_POLICY"]);

export type { ToolPolicy } from "../core/prompts/index.js";

function resolveToolPolicy(value?: string): ToolPolicy {
  return value === "strict" ? "strict" : "shared";
}

/**
 * Scope the invoke-agent tool based on agent hierarchy.
 * - CEO: can invoke orchestrators
 * - Orchestrators: can invoke their direct-report workers
 * - Workers: invoke-agent removed entirely
 */
function scopeToolsForAgent(agent: typeof agentRegistry.all[number], baseTools: ToolsInput): ToolsInput {
  const tools = { ...baseTools };

  if (agent.tier === "ceo") {
    const targets = agentRegistry.orchestrators.map((o) => o.id);
    tools["invoke-agent"] = createInvokeAgentTool(targets);
  } else if (agent.tier === "orchestrator") {
    const targets = agentRegistry.all
      .filter((w) => w.tier === "worker" && w.reportsTo === agent.id)
      .map((w) => w.id);
    tools["invoke-agent"] = createInvokeAgentTool(targets);
  } else {
    // Workers cannot invoke other agents
    delete tools["invoke-agent"];
  }

  return tools;
}

export function createMastraAgents(
  options: { toolPolicy?: ToolPolicy } = {},
): Record<string, Agent> {
  const toolPolicy = resolveToolPolicy(options.toolPolicy ?? defaultToolPolicy);

  return Object.fromEntries(
    agentRegistry.all.map((agent) => {
      const baseTools = toolPolicy === "strict" ? selectToolsForAgent(agent) : sharedTools;
      const tools = scopeToolsForAgent(agent, baseTools);

      return [
        agent.id,
        new Agent({
          id: agent.id,
          name: agent.name,
          description: agent.domain,
          instructions: renderPrompt(agent, toolPolicy),
          model: defaultModel,
          tools,
        }),
      ];
    }),
  );
}

export const mastraAgents = createMastraAgents();
