/**
 * Skill registry (Phase 8.2).
 *
 * OCP-friendly: register a new skill, it appears in the loader automatically.
 * Mirrors the shape of `ScorerRegistry` so an agent that knows one knows the other.
 */

import type { AgentDefinition } from "../core/types.js";
import { promptIterationSkill } from "./prompt-iteration.js";
import { toolEvaluatorSkill } from "./tool-evaluator.js";
import { contractAwareSkill } from "./contract-aware.js";
import type { Skill } from "./interfaces.js";

export const BUILTIN_SKILLS: readonly Skill[] = [
  promptIterationSkill,
  toolEvaluatorSkill,
  contractAwareSkill,
];

export class SkillRegistry {
  private readonly skills: Skill[] = [];

  constructor(seed: readonly Skill[] = BUILTIN_SKILLS) {
    for (const s of seed) {
      this.skills.push(s);
    }
  }

  register(skill: Skill): this {
    if (this.skills.some((s) => s.id === skill.id)) {
      throw new Error(`Skill id already registered: ${skill.id}`);
    }
    this.skills.push(skill);
    return this;
  }

  /** Returns the system-prompt sections contributed by all skills that apply to the agent. */
  resolveFor(agent: AgentDefinition): string[] {
    const sections: string[] = [];
    for (const skill of this.skills) {
      if (skill.appliesTo && !skill.appliesTo.includes(agent.tier)) continue;
      const out = skill.systemPromptSection(agent);
      const arr = Array.isArray(out) ? out : [out];
      for (const s of arr) {
        if (s.trim().length > 0) sections.push(s);
      }
    }
    return sections;
  }

  versions(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const s of this.skills) {
      out[s.id] = s.version;
    }
    return out;
  }

  /** OCP: returns a new registry with the same skills plus the additional ones. */
  extend(additional: readonly Skill[]): SkillRegistry {
    const next = new SkillRegistry(this.skills);
    for (const s of additional) {
      next.register(s);
    }
    return next;
  }

  list(): readonly Skill[] {
    return [...this.skills];
  }
}

export const defaultSkillRegistry = (): SkillRegistry => new SkillRegistry();
