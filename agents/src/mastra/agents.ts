import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { AgentDefinition } from "../core/types.js";
import { CORE_TOOL_IDS, isCoreToolId } from "../core/tool-catalog.js";
import { agentRegistry } from "../core/registry.js";
import { sharedTools, selectToolsForAgent } from "./tool-registry.js";

const defaultModel = (process.env["MASTRA_MODEL"] ?? "openai/gpt-4o") as MastraModelConfig;
const defaultToolPolicy = resolveToolPolicy(process.env["MASTRA_TOOL_POLICY"]);

export type ToolPolicy = "shared" | "strict";

function resolveToolPolicy(value?: string): ToolPolicy {
  return value === "strict" ? "strict" : "shared";
}

const buildInstructions = (agent: AgentDefinition, toolPolicy: ToolPolicy) => {
  const preferredTools = agent.tools;
  const plannedPreferred = preferredTools.filter((tool) => !isCoreToolId(tool));
  const sharedToolList = CORE_TOOL_IDS.join(", ");

  const lines = [
    `You are ${agent.name}, leading ${agent.domain}.`,
    agent.mission,
    `Responsibilities: ${agent.responsibilities.join("; ")}.`,
    `Outputs you must maintain: ${agent.outputs.join("; ")}.`,
    `Metrics you are accountable for: ${agent.metrics.join("; ")}.`,
    `Preferred tools: ${preferredTools.join(", ")}.`,
    `Shared tools available: ${sharedToolList}.`,
    plannedPreferred.length > 0
      ? `Planned tools (not yet enabled by default): ${plannedPreferred.join(", ")}.`
      : null,
    toolPolicy === "strict"
      ? "Tool policy: strict (preferred tools only)."
      : "Tool policy: shared (core tools enabled for all agents).",
  ];
  if (agent.reportsTo) {
    const lead = agentRegistry.all.find((candidate) => candidate.id === agent.reportsTo);
    lines.splice(2, 0, `Reports to: ${lead?.name ?? agent.reportsTo}.`);
  }
  return lines.filter(Boolean).join(" ");
};

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
        instructions: buildInstructions(agent, toolPolicy),
        model: defaultModel,
        tools: toolPolicy === "strict" ? selectToolsForAgent(agent) : sharedTools,
      }),
    ]),
  );
}

export const mastraAgents = createMastraAgents();
