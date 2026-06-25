import { describe, expect, it } from "vitest";

import {
  BUILTIN_SKILLS,
  SkillRegistry,
  contractAwareSkill,
  defaultSkillRegistry,
  loadSkillPromptSections,
  promptIterationSkill,
  toolEvaluatorSkill,
} from "./index.js";
import { promptIterationSkill as promptIterationNamed } from "./prompt-iteration.js";
import { toolEvaluatorSkill as toolEvaluatorNamed } from "./tool-evaluator.js";
import { contractAwareSkill as contractAwareNamed } from "./contract-aware.js";
import type { AgentDefinition } from "../core/types.js";

function agentFixture(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    id: "test-agent",
    name: "Test Agent",
    tier: "worker",
    domain: "Testing",
    mission: "Test things",
    responsibilities: ["test"],
    outputs: ["test results"],
    tools: [],
    metrics: ["test pass rate"],
    ...overrides,
  };
}

describe("Skills (Phase 8.2)", () => {
  it("exports the three built-in skills", () => {
    expect(promptIterationSkill.id).toBe("prompt-iteration");
    expect(toolEvaluatorSkill.id).toBe("tool-evaluator");
    expect(contractAwareSkill.id).toBe("contract-aware");
    expect(BUILTIN_SKILLS).toHaveLength(3);
  });

  it("each skill produces a non-empty system-prompt section", () => {
    const worker = agentFixture({ tier: "worker" });
    expect(promptIterationNamed.systemPromptSection(worker).length).toBeGreaterThan(50);
    expect(toolEvaluatorNamed.systemPromptSection(worker).length).toBeGreaterThan(50);
    expect(contractAwareNamed.systemPromptSection(worker).length).toBeGreaterThan(50);
  });

  it("loadSkillPromptSections for a CEO returns all three skills", () => {
    const ceo = agentFixture({ id: "ceo", tier: "ceo" });
    const sections = loadSkillPromptSections(ceo);
    expect(sections).toHaveLength(3);
  });

  it("loadSkillPromptSections for a worker skips prompt-iteration", () => {
    const worker = agentFixture({ id: "cipher-1", tier: "worker" });
    const sections = loadSkillPromptSections(worker);
    // prompt-iteration applies to ceo + orchestrator only.
    expect(sections).toHaveLength(2);
    expect(sections.some((s) => s.includes("Prompt Iteration"))).toBe(false);
    expect(sections.some((s) => s.includes("Tool Evaluation"))).toBe(true);
    expect(sections.some((s) => s.includes("Contract-Aware"))).toBe(true);
  });

  it("loadSkillPromptSections for an orchestrator returns all three", () => {
    const orch = agentFixture({ id: "orch-centaurus-a", tier: "orchestrator" });
    expect(loadSkillPromptSections(orch)).toHaveLength(3);
  });

  it("SkillRegistry rejects duplicate ids", () => {
    const reg = new SkillRegistry([]);
    reg.register(promptIterationSkill);
    expect(() => reg.register(promptIterationSkill)).toThrow(/already registered/);
  });

  it("SkillRegistry.extend returns a NEW registry without mutating the original (OCP)", () => {
    const original = new SkillRegistry([]);
    original.register(promptIterationSkill);
    const extended = original.extend([toolEvaluatorSkill]);
    expect(original.list()).toHaveLength(1);
    expect(extended.list()).toHaveLength(2);
  });

  it("SkillRegistry.versions() returns a version map", () => {
    const reg = defaultSkillRegistry();
    const v = reg.versions();
    expect(v["prompt-iteration"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(v["tool-evaluator"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(v["contract-aware"]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("loadSkillPromptSections returns sections in registry order", () => {
    const reg = new SkillRegistry([contractAwareSkill, promptIterationSkill, toolEvaluatorSkill]);
    const orch = agentFixture({ tier: "orchestrator" });
    const sections = loadSkillPromptSections(orch, reg);
    expect(sections[0]?.includes("Contract-Aware")).toBe(true);
    expect(sections[1]?.includes("Prompt Iteration")).toBe(true);
    expect(sections[2]?.includes("Tool Evaluation")).toBe(true);
  });
});
