import { describe, expect, it } from "vitest";
import { createAgentLookup } from "./agent-lookup.js";

describe("agent lookup", () => {
  it("returns true for existing agents and false for missing agents", () => {
    const lookup = createAgentLookup();
    expect(lookup.exists("ceo")).toBe(true);
    expect(lookup.exists("nonexistent")).toBe(false);
  });
});
