import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { AgentDefinition } from "../core/types.js";
import { agentRegistry } from "../core/registry.js";
import {
  systemStatusTool,
  llmRouterTool,
  knowledgeBaseTool,
  workflowRunnerTool,
} from "./tools/index.js";
import { loadSkillPromptSections, defaultSkillRegistry } from "../skills/index.js";

const defaultModel = (process.env["MASTRA_MODEL"] ?? "openai/gpt-4o") as MastraModelConfig;
const sharedTools = {
  "system-status": systemStatusTool,
  "llm-router": llmRouterTool,
  "knowledge-base": knowledgeBaseTool,
  "workflow-runner": workflowRunnerTool,
};

const skillRegistry = defaultSkillRegistry();

const buildInstructions = (agent: AgentDefinition): string => {
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
  // Skills augment the prompt with reasoning patterns. They are additional
  // context, not replacements. See docs/adr/0007-skills-vs-tools.md.
  const skillSections = loadSkillPromptSections(agent, skillRegistry);
  if (skillSections.length > 0) {
    lines.push("", "# Skills", "", ...skillSections);
  }
  return lines.join("\n");
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
