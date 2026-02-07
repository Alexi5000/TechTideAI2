/**
 * Prompt Management Module
 *
 * Provides template-based prompt rendering for agents.
 */

export type { PromptTemplate, PromptVariables } from "./types.js";
export type { ToolPolicy } from "./renderer.js";
export { renderPrompt, buildVariables, interpolate } from "./renderer.js";
export {
  AGENT_SYSTEM_V1,
  getTemplate,
  registerTemplate,
  listTemplateIds,
} from "./templates.js";
