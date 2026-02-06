import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { AgentDefinition } from "../core/types.js";
import { agentRegistry } from "../core/registry.js";
import {
  systemStatusTool,
  llmRouterTool,
  knowledgeBaseTool,
  workflowRunnerTool,
  orgKpiDashboardTool,
  executionMapTool,
  marketIntelTool,
} from "./tools/index.js";

const defaultModel = (process.env["MASTRA_MODEL"] ?? "openai/gpt-4o") as MastraModelConfig;
const sharedTools = {
  // Implemented tools
  "system-status": systemStatusTool,
  "llm-router": llmRouterTool,
  "knowledge-base": knowledgeBaseTool,
  "workflow-runner": workflowRunnerTool,
  "org-kpi-dashboard": orgKpiDashboardTool,
  "execution-map": executionMapTool,
  "market-intel": marketIntelTool,
};

const buildInstructions = (agent: AgentDefinition) => {
  const lines = [
    `You are ${agent.name}, leading ${agent.domain}.`,
    agent.mission,
    `Responsibilities: ${agent.responsibilities.join("; ")}.`,
    `Outputs you must maintain: ${agent.outputs.join("; ")}.`,
    `Metrics you are accountable for: ${agent.metrics.join("; ")}.`,
    `Available tools: ${Object.keys(sharedTools).join(", ")}.`,
  ];
  if (agent.reportsTo) {
    const lead = agentRegistry.all.find((candidate) => candidate.id === agent.reportsTo);
    lines.splice(2, 0, `Reports to: ${lead?.name ?? agent.reportsTo}.`);
  }
  return lines.join(" ");
};

export const mastraAgents = Object.fromEntries(
  agentRegistry.all.map((agent) => [
    agent.id,
    new Agent({
      id: agent.id,
      name: agent.name,
      description: agent.domain,
      instructions: buildInstructions(agent),
      model: defaultModel,
      tools: sharedTools,
    }),
  ]),
);
