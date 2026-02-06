import { describe, expect, it } from "vitest";
import { agentRegistry, getAgentById } from "./registry.js";
import type { AgentDefinition } from "./types.js";

describe("agent registry", () => {
  it("contains exactly 1 CEO, 10 orchestrators, and 50 workers", () => {
    expect(agentRegistry.ceo.tier).toBe("ceo");
    expect(agentRegistry.orchestrators).toHaveLength(10);
    expect(agentRegistry.workers).toHaveLength(50);
    expect(agentRegistry.all).toHaveLength(61);
  });

  it("every agent has all required fields", () => {
    for (const agent of agentRegistry.all) {
      expect(agent.id, `${agent.id} missing id`).toBeTruthy();
      expect(agent.name, `${agent.id} missing name`).toBeTruthy();
      expect(agent.tier, `${agent.id} missing tier`).toMatch(/^(ceo|orchestrator|worker)$/);
      expect(agent.domain, `${agent.id} missing domain`).toBeTruthy();
      expect(agent.mission, `${agent.id} missing mission`).toBeTruthy();
      expect(agent.responsibilities.length, `${agent.id} no responsibilities`).toBeGreaterThan(0);
      expect(agent.outputs.length, `${agent.id} no outputs`).toBeGreaterThan(0);
      expect(agent.metrics.length, `${agent.id} no metrics`).toBeGreaterThan(0);
    }
  });

  it("all IDs are unique", () => {
    const ids = agentRegistry.all.map((a: AgentDefinition) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all reportsTo references point to valid agents", () => {
    const idSet = new Set(agentRegistry.all.map((a: AgentDefinition) => a.id));
    for (const agent of agentRegistry.all) {
      if (agent.reportsTo) {
        expect(idSet.has(agent.reportsTo), `${agent.id} reportsTo invalid: ${agent.reportsTo}`).toBe(true);
      }
    }
  });

  it("workers always have a reportsTo reference", () => {
    for (const worker of agentRegistry.workers) {
      expect(worker.reportsTo, `worker ${worker.id} missing reportsTo`).toBeTruthy();
    }
  });

  it("getAgentById returns correct agent", () => {
    expect(getAgentById("ceo")?.name).toBe("Brian Cozy");
    expect(getAgentById("orch-veronica")?.name).toBe("Veronica Cozy");
    expect(getAgentById("nonexistent")).toBeNull();
  });

  it("tools are filtered to implemented set only", () => {
    const implementedTools = new Set([
      "system-status", "llm-router", "knowledge-base",
      "workflow-runner", "org-kpi-dashboard", "execution-map", "market-intel",
    ]);

    for (const agent of agentRegistry.all) {
      for (const tool of agent.tools) {
        expect(
          implementedTools.has(tool),
          `${agent.id} has unimplemented tool: ${tool}`,
        ).toBe(true);
      }
    }
  });
});
