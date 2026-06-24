/**
 * ApprovalRequest entity, Phase 3.
 *
 * A pending human-in-the-loop decision for a high-risk agent action. The
 * ApprovalRequest is the durable artifact; the run that triggered it pauses
 * until the request is granted or denied (or expires).
 *
 * Status vocabulary is intentionally small: `pending | granted | denied | expired`.
 * The four states are exhaustive, anything else is a bug.
 *
 * The canonical TS type for `ApprovalRiskTier` lives in `@techtide/agents`
 * (see `agents/src/core/approval-policy.ts`) so the agents package and the
 * backend share a single source of truth. This module re-derives the
 * Zod enum from that canonical type so the runtime schema and the
 * TypeScript type can never drift.
 */

import { z } from "zod";

import type { ApprovalRiskTier as CanonicalRiskTier } from "@techtide/agents";

export const ApprovalRiskTierSchema = z.enum([
  "read",
  "write",
  "external",
  "destructive",
  "billing",
]);
export type ApprovalRiskTier = CanonicalRiskTier;

export const ApprovalStatusSchema = z.enum([
  "pending",
  "granted",
  "denied",
  "expired",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z
  .object({
    id: z.string().uuid(),
    runId: z.string().uuid(),
    orgId: z.string().uuid(),
    agentId: z.string().min(1),
    action: z.string().min(1),
    payload: z.record(z.string(), z.unknown()).default({}),
    riskTier: ApprovalRiskTierSchema,
    status: ApprovalStatusSchema,
    requestedAt: z.string(),
    decidedAt: z.string().nullable(),
    decidedBy: z.string().nullable(),
    rationale: z.string().nullable(),
    expiresAt: z.string(),
    policyVersion: z.string().min(1),
  })
  .strict();

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export function parseApprovalRequest(input: unknown): ApprovalRequest {
  return ApprovalRequestSchema.parse(input);
}

export function isPending(approval: ApprovalRequest): boolean {
  return approval.status === "pending";
}

export { isHighRisk } from "@techtide/agents";