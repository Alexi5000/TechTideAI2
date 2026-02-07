import { describe, expect, it } from "vitest";
import { renderPrompt, interpolate, buildVariables } from "./renderer.js";
import { AGENT_SYSTEM_V1, getTemplate, registerTemplate, listTemplateIds } from "./templates.js";
import type { PromptTemplate } from "./types.js";
import { agentRegistry } from "../registry.js";

const ceoAgent = agentRegistry.all.find((a) => a.id === "ceo")!;

describe("prompt management", () => {
  it("renders the default template with all agent fields", () => {
    const result = renderPrompt(ceoAgent, "shared");
    expect(result).toContain("Brian Cozy");
    expect(result).toContain("Executive Leadership");
    expect(result).toContain("strategic decision support");
    expect(result).toContain("Responsibilities:");
    expect(result).toContain("Outputs you must maintain:");
    expect(result).toContain("Metrics you are accountable for:");
    expect(result).toContain("Preferred tools:");
    expect(result).toContain("Shared tools available:");
  });

  it("CEO prompt includes all 4 declared tools", () => {
    const result = renderPrompt(ceoAgent, "shared");
    for (const tool of ceoAgent.tools) {
      expect(result).toContain(tool);
    }
  });

  it("strict policy prompt includes 'strict' text", () => {
    const result = renderPrompt(ceoAgent, "strict");
    expect(result).toContain("Tool policy: strict (preferred tools only).");
  });

  it("shared policy prompt includes 'shared' text", () => {
    const result = renderPrompt(ceoAgent, "shared");
    expect(result).toContain("Tool policy: shared (core tools enabled for all agents).");
  });

  it("custom template overrides the default", () => {
    const custom: PromptTemplate = {
      id: "custom-test",
      version: "1.0.0",
      template: "Agent {{name}} works on {{domain}}.",
      variables: ["name", "domain"],
    };
    const result = renderPrompt(ceoAgent, "shared", custom);
    expect(result).toBe("Agent Brian Cozy works on Executive Leadership.");
  });

  it("interpolate handles missing optional variables gracefully", () => {
    const result = interpolate("Hello {{name}} {{missing}} world", { name: "Alice" });
    expect(result).toBe("Hello Alice world");
  });

  it("buildVariables includes reportsTo for worker agents", () => {
    const worker = agentRegistry.all.find((a) => a.reportsTo !== undefined)!;
    const vars = buildVariables(worker, "shared");
    expect(vars.reportsTo).toContain("Reports to:");
  });

  it("buildVariables omits reportsTo for CEO", () => {
    const vars = buildVariables(ceoAgent, "shared");
    expect(vars.reportsTo).toBeUndefined();
  });
});

describe("template registry", () => {
  it("AGENT_SYSTEM_V1 is registered by default", () => {
    const tmpl = getTemplate("agent-system-v1");
    expect(tmpl).toBe(AGENT_SYSTEM_V1);
  });

  it("registerTemplate adds a custom template", () => {
    const custom: PromptTemplate = {
      id: "test-custom-registry",
      version: "1.0.0",
      template: "test",
      variables: [],
    };
    registerTemplate(custom);
    expect(getTemplate("test-custom-registry")).toBe(custom);
    expect(listTemplateIds()).toContain("test-custom-registry");
  });
});
