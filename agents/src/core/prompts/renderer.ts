/**
 * Prompt Renderer
 *
 * Renders prompt templates by interpolating variables. Drop-in replacement
 * for the original buildInstructions() function.
 */

import type { AgentDefinition } from "../types.js";
import { CORE_TOOL_IDS, isCoreToolId } from "../tool-catalog.js";
import { agentRegistry } from "../registry.js";
import type { PromptTemplate, PromptVariables } from "./types.js";
import { AGENT_SYSTEM_V1 } from "./templates.js";

export type ToolPolicy = "shared" | "strict";

/**
 * Interpolate a template string with {{variable}} placeholders.
 * Removes lines that resolve to empty strings.
 */
export function interpolate(
  template: string,
  vars: Record<string, string | undefined>,
): string {
  const result = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });

  // Clean up double spaces from removed optional variables
  return result.replace(/ {2,}/g, " ").trim();
}

/**
 * Build the variable bag for an agent definition + tool policy.
 */
export function buildVariables(
  agent: AgentDefinition,
  toolPolicy: ToolPolicy,
): PromptVariables {
  const preferredTools = agent.tools;
  const plannedPreferred = preferredTools.filter((tool) => !isCoreToolId(tool));
  const sharedToolList = CORE_TOOL_IDS.join(", ");

  let reportsTo: string | undefined;
  if (agent.reportsTo) {
    const lead = agentRegistry.all.find((candidate) => candidate.id === agent.reportsTo);
    reportsTo = `Reports to: ${lead?.name ?? agent.reportsTo}.`;
  }

  const toolPolicyLine =
    toolPolicy === "strict"
      ? "Tool policy: strict (preferred tools only)."
      : "Tool policy: shared (core tools enabled for all agents).";

  return {
    name: agent.name,
    domain: agent.domain,
    mission: agent.mission,
    responsibilities: agent.responsibilities.join("; "),
    outputs: agent.outputs.join("; "),
    metrics: agent.metrics.join("; "),
    preferredTools: preferredTools.join(", "),
    sharedTools: sharedToolList,
    plannedTools:
      plannedPreferred.length > 0
        ? `Planned tools (not yet enabled by default): ${plannedPreferred.join(", ")}.`
        : undefined,
    reportsTo,
    toolPolicyLine,
  };
}

/**
 * Render a prompt for an agent. Uses the default template if none specified.
 *
 * This is the primary API — a drop-in replacement for buildInstructions().
 */
export function renderPrompt(
  agent: AgentDefinition,
  toolPolicy: ToolPolicy,
  template?: PromptTemplate,
): string {
  const tmpl = template ?? AGENT_SYSTEM_V1;
  const vars = buildVariables(agent, toolPolicy);
  return interpolate(tmpl.template, vars as unknown as Record<string, string | undefined>);
}
