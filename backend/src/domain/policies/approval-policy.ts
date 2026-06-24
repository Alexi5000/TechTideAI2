/**
 * Approval Policy, Domain Rule (re-export).
 *
 * The canonical implementation lives in `@techtide/agents` so the agents
 * package can use it without depending on the backend. This module
 * re-exports it for backend consumers (approval service, routes, etc.) so
 * the rest of the codebase keeps importing from `@techtide/backend` and
 * no callers need to change.
 */

export {
  ApprovalPolicy,
  defaultApprovalPolicy,
  defaultRiskClassifier,
  isHighRisk,
} from "@techtide/agents";

export type {
  ApprovalDecision,
  ApprovalRequest,
  ApprovalRiskTier,
  RiskClassifier,
} from "@techtide/agents";