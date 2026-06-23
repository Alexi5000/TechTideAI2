import { describe, expect, it } from "vitest";

import { ScorerRegistry } from "./scorer-policy.js";
import type { Scorer } from "../../services/scoring/interfaces.js";

const stubScorer: Scorer = {
  kind: "exact-match",
  async score() {
    return { score: 1, passed: true, rationale: "stub", durationMs: 0 };
  },
};

describe("ScorerRegistry", () => {
  it("registers and retrieves entries", () => {
    const reg = new ScorerRegistry<Scorer>();
    reg.register({ kind: "exact-match", version: "1.0.0", factory: () => stubScorer });
    expect(reg.has("exact-match")).toBe(true);
    expect(reg.get("exact-match").version).toBe("1.0.0");
  });

  it("rejects duplicate registration", () => {
    const reg = new ScorerRegistry<Scorer>();
    reg.register({ kind: "exact-match", version: "1.0.0", factory: () => stubScorer });
    expect(() =>
      reg.register({ kind: "exact-match", version: "1.0.1", factory: () => stubScorer }),
    ).toThrow(/already registered/);
  });

  it("versions() returns version map", () => {
    const reg = new ScorerRegistry<Scorer>();
    reg.register({ kind: "exact-match", version: "1.0.0", factory: () => stubScorer });
    reg.register({ kind: "regex", version: "2.3.4", factory: () => stubScorer });
    expect(reg.versions()).toEqual({ "exact-match": "1.0.0", regex: "2.3.4" });
  });

  it("extend returns a new registry without mutating the original (OCP)", () => {
    const original = new ScorerRegistry<Scorer>();
    original.register({ kind: "exact-match", version: "1.0.0", factory: () => stubScorer });
    const extended = original.extend([
      { kind: "regex", version: "1.0.0", factory: () => stubScorer },
    ]);
    expect(original.has("regex")).toBe(false);
    expect(extended.has("exact-match")).toBe(true);
    expect(extended.has("regex")).toBe(true);
  });
});
