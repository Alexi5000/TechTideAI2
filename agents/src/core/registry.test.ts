import { describe, expect, it } from "vitest";
import { agentRegistry, getAgentById } from "./registry.js";

describe("agentRegistry", () => {
  it("keeps one CEO, orchestrators, and worker agents available", () => {
    expect(agentRegistry.ceo.tier).toBe("ceo");
    // The 61-agent invariant is enforced strictly: 1 ceo + 10 orchestrators +
    // 50 workers. Adding a worker without updating the pod, or an orchestrator
    // without updating the runtime config, fails this test.
    expect(agentRegistry.orchestrators).toHaveLength(10);
    expect(agentRegistry.workers).toHaveLength(50);
    expect(agentRegistry.all).toHaveLength(61);
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
