/**
 * Skill interfaces (Phase 8.2).
 *
 * A Skill is *augmenting context for the agent's reasoning*, not a tool that
 * executes a function. Tools are in `agents/src/mastra/tools/`; skills live
 * here, parallel to tools. See `docs/adr/0007-skills-vs-tools.md`.
 *
 * The function form of `systemPromptSection` is so a skill can read the
 * agent's `AgentDefinition` and tailor its prompt. Skills return strings
 * (the actual markdown) or a list of strings (joined in order).
 */

import type { AgentDefinition } from "../core/types.js";

export type AgentTier = AgentDefinition["tier"];

export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Returns the system-prompt section contributed by this skill for the given agent. */
  systemPromptSection(agent: AgentDefinition): string | string[];
  /** Which tiers this skill applies to. `undefined` means all tiers. */
  readonly appliesTo?: readonly AgentTier[];
  readonly version: string;
}
