import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { agentRegistry } from "../core/registry.js";
import { renderPrompt, type ToolPolicy } from "../core/prompts/index.js";
import { sharedTools, selectToolsForAgent } from "./tool-registry.js";

const defaultModel = (process.env["MASTRA_MODEL"] ?? "openai/gpt-4o") as MastraModelConfig;
const defaultToolPolicy = resolveToolPolicy(process.env["MASTRA_TOOL_POLICY"]);

export type { ToolPolicy } from "../core/prompts/index.js";

function resolveToolPolicy(value?: string): ToolPolicy {
  return value === "strict" ? "strict" : "shared";
}

export function createMastraAgents(
  options: { toolPolicy?: ToolPolicy } = {},
): Record<string, Agent> {
  const toolPolicy = resolveToolPolicy(options.toolPolicy ?? defaultToolPolicy);

  return Object.fromEntries(
    agentRegistry.all.map((agent) => [
      agent.id,
      new Agent({
        id: agent.id,
        name: agent.name,
        description: agent.domain,
        instructions: renderPrompt(agent, toolPolicy),
        model: defaultModel,
        tools: toolPolicy === "strict" ? selectToolsForAgent(agent) : sharedTools,
      }),
    ]),
  );
}

export const mastraAgents = createMastraAgents();
