import { describe, expect, it } from "vitest";

import { parseApprovalRequest } from "./approval-request.js";

// The seeded default organization id is not an RFC 9562 UUID (version nibble 0).
// Zod 4's z.string().uuid() rejects it, so ids are validated with z.guid(),
// which keeps the Zod 3 8-4-4-4-12 hex behaviour.
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

const base = {
  id: "3f1c2b8e-9d4a-4c6b-8e2f-1a2b3c4d5e6f",
  runId: "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
  orgId: DEFAULT_ORG_ID,
  agentId: "ceo",
  action: "send-email",
  riskTier: "external",
  status: "pending",
  requestedAt: "2026-10-26T00:00:00.000Z",
  decidedAt: null,
  decidedBy: null,
  rationale: null,
  expiresAt: "2026-10-27T00:00:00.000Z",
  policyVersion: "approval-policy-v1",
};

describe("ApprovalRequestSchema id validation", () => {
  it("accepts the seeded default org id and defaults payload to {}", () => {
    const parsed = parseApprovalRequest(base);
    expect(parsed.orgId).toBe(DEFAULT_ORG_ID);
    expect(parsed.payload).toEqual({});
  });

  it("rejects ids that are not 8-4-4-4-12 hex", () => {
    expect(() => parseApprovalRequest({ ...base, runId: "not-a-uuid" })).toThrow();
  });

  it("accepts string-keyed payload records of unknown values", () => {
    const parsed = parseApprovalRequest({ ...base, payload: { a: 1, b: { c: "d" } } });
    expect(parsed.payload).toEqual({ a: 1, b: { c: "d" } });
  });
});
