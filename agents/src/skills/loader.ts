/**
 * Skill loader (Phase 8.2).
 *
 * Resolves the system-prompt sections contributed by all skills that apply to
 * a given agent. Composes with the Mastra instructions builder in
 * `agents/src/mastra/agents.ts` — skills augment the prompt; they do not
 * replace it.
 */

import { defaultSkillRegistry, type SkillRegistry } from "./registry.js";
import type { AgentDefinition } from "../core/types.js";

export function loadSkillPromptSections(
  agent: AgentDefinition,
  registry: SkillRegistry = defaultSkillRegistry(),
): string[] {
  return registry.resolveFor(agent);
}
