import { Agent } from "@mastra/core/agent";
import type { AgentDefinition } from "../core/types.js";
import { agentRegistry } from "../core/registry.js";
import {
  systemStatusTool,
  llmRouterTool,
  knowledgeBaseTool,
  workflowRunnerTool,
} from "./tools/index.js";

const defaultModel = process.env.MASTRA_MODEL ?? "openai/gpt-5.1";
const sharedTools = [
  systemStatusTool,
  llmRouterTool,
  knowledgeBaseTool,
  workflowRunnerTool,
];

const buildInstructions = (agent: AgentDefinition) => {
  return [
    `You are ${agent.name}, leading ${agent.domain}.`,
    agent.mission,
    `Responsibilities: ${agent.responsibilities.join("; ")}.`,
    `Outputs you must maintain: ${agent.outputs.join("; ")}.`,
    `Metrics you are accountable for: ${agent.metrics.join("; ")}.`,
    `Available tools: ${sharedTools.map((tool) => tool.id).join(", ")}.`,
  ].join(" ");
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
