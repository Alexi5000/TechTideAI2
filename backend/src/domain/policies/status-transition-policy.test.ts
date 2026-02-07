import { describe, expect, it } from "vitest";
import { defaultStatusTransitionPolicy } from "./status-transition-policy.js";

describe("StatusTransitionPolicy", () => {
  it("allows queued → running", () => {
    expect(defaultStatusTransitionPolicy.canTransition("queued", "running")).toBe(true);
  });

  it("allows queued → canceled", () => {
    expect(defaultStatusTransitionPolicy.canTransition("queued", "canceled")).toBe(true);
  });

  it("allows running → succeeded | failed | canceled", () => {
    expect(defaultStatusTransitionPolicy.canTransition("running", "succeeded")).toBe(true);
    expect(defaultStatusTransitionPolicy.canTransition("running", "failed")).toBe(true);
    expect(defaultStatusTransitionPolicy.canTransition("running", "canceled")).toBe(true);
  });

  it("blocks terminal states from transitioning", () => {
    expect(defaultStatusTransitionPolicy.canTransition("succeeded", "running")).toBe(false);
    expect(defaultStatusTransitionPolicy.canTransition("failed", "running")).toBe(false);
    expect(defaultStatusTransitionPolicy.canTransition("canceled", "running")).toBe(false);
  });

  it("blocks invalid transitions", () => {
    expect(defaultStatusTransitionPolicy.canTransition("queued", "succeeded")).toBe(false);
    expect(defaultStatusTransitionPolicy.canTransition("queued", "failed")).toBe(false);
    expect(defaultStatusTransitionPolicy.canTransition("running", "queued")).toBe(false);
  });

  it("extend adds new transitions without mutating original", () => {
    const extended = defaultStatusTransitionPolicy.extend([
      { from: "failed", to: ["queued"] },
    ]);

    expect(extended.canTransition("failed", "queued")).toBe(true);
    expect(defaultStatusTransitionPolicy.canTransition("failed", "queued")).toBe(false);
  });
});
