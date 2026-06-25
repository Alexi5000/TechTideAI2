import { describe, expect, it } from "vitest";
import { agentRegistry, getAgentById } from "./registry.js";

describe("agentRegistry", () => {
  it("keeps one CEO, orchestrators, and worker agents available", () => {
    expect(agentRegistry.ceo.tier).toBe("ceo");
    expect(agentRegistry.orchestrators.length).toBeGreaterThanOrEqual(10);
    expect(agentRegistry.workers.length).toBeGreaterThanOrEqual(50);
    expect(agentRegistry.all).toHaveLength(
      1 + agentRegistry.orchestrators.length + agentRegistry.workers.length,
    );
  });

  it("keeps agent ids unique and routable", () => {
    const ids = agentRegistry.all.map((agent) => agent.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getAgentById("ceo")?.name).toBe("Local Group Director");
    expect(getAgentById("missing-agent")).toBeNull();
  });

  it("only reports workers to known lead agents", () => {
    const ids = new Set(agentRegistry.all.map((agent) => agent.id));
    for (const worker of agentRegistry.workers) {
      expect(worker.reportsTo).toBeTruthy();
      expect(ids.has(worker.reportsTo ?? "")).toBe(true);
    }
  });
});
