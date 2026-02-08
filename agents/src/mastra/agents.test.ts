import { describe, expect, it } from "vitest";
import { agentRegistry } from "../core/registry.js";
import { CORE_TOOL_IDS, TOOL_IDS } from "../core/tool-catalog.js";
import { createMastraAgents, mastraAgents } from "./agents.js";
import { sharedTools, toolRegistry, selectToolsForAgent } from "./tool-registry.js";

describe("mastra agent tools", () => {
  it("shared tools match the core tool catalog", () => {
    const sharedIds = Object.keys(sharedTools).sort();
    const coreIds = [...CORE_TOOL_IDS].sort();
    expect(sharedIds).toEqual(coreIds);
  });

  it("full tool registry matches the catalog", () => {
    const registryIds = Object.keys(toolRegistry).sort();
    const catalogIds = [...TOOL_IDS].sort();
    expect(registryIds).toEqual(catalogIds);
  });

  it("creates a runtime agent for every registry entry", () => {
    const runtimeIds = Object.keys(mastraAgents).sort();
    const registryIds = agentRegistry.all.map((a) => a.id).sort();
    expect(runtimeIds).toEqual(registryIds);
  });

  it("shared policy creates an agent for every registry entry", () => {
    const agents = createMastraAgents({ toolPolicy: "shared" });
    const agentIds = Object.keys(agents).sort();
    const registryIds = agentRegistry.all.map((a) => a.id).sort();
    expect(agentIds).toEqual(registryIds);
  });

  it("strict policy creates an agent for every registry entry", () => {
    const agents = createMastraAgents({ toolPolicy: "strict" });
    const agentIds = Object.keys(agents).sort();
    const registryIds = agentRegistry.all.map((a) => a.id).sort();
    expect(agentIds).toEqual(registryIds);
  });

  it("selectToolsForAgent returns only declared tools for each agent", () => {
    for (const agent of agentRegistry.all) {
      const tools = selectToolsForAgent(agent);
      const toolIds = Object.keys(tools).sort();
      const expectedIds = [...agent.tools].sort();
      expect(toolIds, `tool mismatch for ${agent.id}`).toEqual(expectedIds);
    }
  });
});
