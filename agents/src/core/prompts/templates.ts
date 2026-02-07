/**
 * Prompt Template Registry
 *
 * Contains built-in prompt templates extracted from the original
 * buildInstructions() function in agents.ts.
 */

import type { PromptTemplate } from "./types.js";

/**
 * Default agent system prompt template (v1).
 * Reproduces the exact output of the original buildInstructions().
 */
export const AGENT_SYSTEM_V1: PromptTemplate = {
  id: "agent-system-v1",
  version: "1.0.0",
  template: [
    "You are {{name}}, leading {{domain}}.",
    "{{mission}}",
    "{{reportsTo}}",
    "Responsibilities: {{responsibilities}}.",
    "Outputs you must maintain: {{outputs}}.",
    "Metrics you are accountable for: {{metrics}}.",
    "Preferred tools: {{preferredTools}}.",
    "Shared tools available: {{sharedTools}}.",
    "{{plannedTools}}",
    "{{toolPolicyLine}}",
  ].join(" "),
  variables: [
    "name",
    "domain",
    "mission",
    "responsibilities",
    "outputs",
    "metrics",
    "preferredTools",
    "sharedTools",
    "toolPolicyLine",
  ],
  metadata: {
    description: "Default agent system prompt matching original buildInstructions output",
  },
};

const templateRegistry = new Map<string, PromptTemplate>();

templateRegistry.set(AGENT_SYSTEM_V1.id, AGENT_SYSTEM_V1);

/**
 * Get a template by ID. Returns undefined if not found.
 */
export function getTemplate(id: string): PromptTemplate | undefined {
  return templateRegistry.get(id);
}

/**
 * Register a custom template. Overwrites if the ID already exists.
 */
export function registerTemplate(template: PromptTemplate): void {
  templateRegistry.set(template.id, template);
}

/**
 * List all registered template IDs.
 */
export function listTemplateIds(): string[] {
  return [...templateRegistry.keys()];
}
