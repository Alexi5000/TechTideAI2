import { describe, expect, it } from "vitest";

import { ApprovalPolicy, defaultRiskClassifier } from "./approval-policy.js";

describe("ApprovalPolicy", () => {
  it("classifies billing actions", () => {
    const p = new ApprovalPolicy();
    expect(p.classify("issue_payment", { vendorId: "v1", amountUsd: 50000 })).toBe("billing");
    expect(p.classify("create_invoice", {})).toBe("billing");
  });

  it("classifies destructive actions", () => {
    const p = new ApprovalPolicy();
    expect(p.classify("delete_customer_record", { customerId: "c1" })).toBe("destructive");
    expect(p.classify("purge_database", { table: "users" })).toBe("destructive");
  });

  it("classifies external actions", () => {
    const p = new ApprovalPolicy();
    expect(p.classify("send_email", { to: "x@y.com" })).toBe("external");
    expect(p.classify("post_to_webhook", {})).toBe("external");
  });

  it("classifies write actions", () => {
    const p = new ApprovalPolicy();
    expect(p.classify("update_dashboard", {})).toBe("write");
    expect(p.classify("create_doc", {})).toBe("write");
  });

  it("defaults to read", () => {
    const p = new ApprovalPolicy();
    expect(p.classify("list_things", {})).toBe("read");
  });

  it("requires approval for high-risk tiers only", () => {
    const p = new ApprovalPolicy();
    expect(p.decide("list_things", {}).requiresApproval).toBe(false);
    expect(p.decide("update_doc", {}).requiresApproval).toBe(false);
    expect(p.decide("send_email", {}).requiresApproval).toBe(true);
    expect(p.decide("delete_record", {}).requiresApproval).toBe(true);
    expect(p.decide("issue_payment", {}).requiresApproval).toBe(true);
  });

  it("supports OCP extension of high-risk tiers", () => {
    const p = new ApprovalPolicy().extend(["write"]);
    expect(p.decide("update_doc", {}).requiresApproval).toBe(true);
  });

  it("exposes the default risk classifier", () => {
    expect(defaultRiskClassifier.classify("send_message", {})).toBe("external");
  });
});
