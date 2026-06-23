export type { AgentDefinition, AgentTier } from "./types.js";
export { agentRegistry, getAgentById } from "./registry.js";

export {
  ApprovalPolicy,
  defaultApprovalPolicy,
  defaultRiskClassifier,
  isHighRisk,
} from "./approval-policy.js";
export type {
  ApprovalDecision,
  ApprovalRequest,
  ApprovalRiskTier,
  RiskClassifier,
} from "./approval-policy.js";