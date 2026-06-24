/**
 * Domain Layer - Barrel Export
 *
 * Re-exports all domain entities, exceptions, and policies.
 * This is the public API of the domain layer.
 */

// Entities
export type {
  Run,
  RunEvent,
  RunStatus,
  CreateRunInput,
} from "./entities/run.js";
export type {
  KnowledgeDocument,
  KnowledgeChunk,
  CreateKnowledgeDocumentInput,
  KnowledgeSearchResult,
} from "./entities/knowledge.js";
export type {
  EvalTask,
  EvalCategory,
  EvalDifficulty,
  EvalExpected,
} from "./entities/eval-task.js";
export { EvalTaskSchema, parseEvalTask } from "./entities/eval-task.js";
export type {
  EvalTaskResult,
  ScoringBreakdown,
  ScorerKind,
} from "./entities/eval-result.js";
export {
  EvalTaskResultSchema,
  parseEvalTaskResult,
  ScoringBreakdownSchema,
  ScorerKindSchema,
} from "./entities/eval-result.js";
export type { EvalRun, EvalRunStatus, EvalRunSummary } from "./entities/eval-run.js";
export {
  EvalRunSchema,
  EvalRunStatusSchema,
  EvalRunSummarySchema,
  emptyEvalRun,
  summarize,
} from "./entities/eval-run.js";
export type { EvalSuite, ScorerSpec } from "./entities/eval-suite.js";
export { EvalSuiteSchema, ScorerSpecSchema, parseEvalSuite, resolveScorers } from "./entities/eval-suite.js";

// Exceptions
export {
  DomainError,
  RunNotFoundError,
  InvalidStatusTransitionError,
  AgentNotFoundError,
  PersistenceUnavailableError,
  VectorStoreUnavailableError,
  EmbeddingProviderUnavailableError,
  EvalSuiteNotFoundError,
  EvalRunNotFoundError,
  ScorerUnavailableError,
  EvalRegressionDetectedError,
  ApprovalNotFoundError,
  ApprovalAlreadyDecidedError,
  ApprovalExpiredError,
} from "./exceptions/index.js";

// Policies
export {
  StatusTransitionPolicy,
  defaultStatusTransitionPolicy,
} from "./policies/status-transition-policy.js";
export type { StatusTransitionRule } from "./policies/status-transition-policy.js";
export {
  ScorerRegistry,
} from "./policies/scorer-policy.js";
export type { ScorerPolicyEntry } from "./policies/scorer-policy.js";
export {
  ApprovalPolicy,
  defaultApprovalPolicy,
  defaultRiskClassifier,
} from "./policies/approval-policy.js";
export type { ApprovalDecision, RiskClassifier } from "./policies/approval-policy.js";

// Approval domain (Phase 3)
export type {
  ApprovalRequest,
  ApprovalRiskTier,
  ApprovalStatus,
} from "./entities/approval-request.js";
export {
  ApprovalRequestSchema,
  ApprovalRiskTierSchema,
  ApprovalStatusSchema,
  parseApprovalRequest,
  isHighRisk,
  isPending,
} from "./entities/approval-request.js";
export type {
  RunEventType,
  RunEventSeverity,
  RunEventV2,
} from "./entities/run-event.js";
export {
  RunEventTypeSchema,
  RunEventSeveritySchema,
  RunEventV2Schema,
  parseRunEventV2,
} from "./entities/run-event.js";
export type { SprintContract } from "./entities/sprint-contract.js";
export {
  SprintContractSchema,
  parseSprintContract,
} from "./entities/sprint-contract.js";
export type { SprintResult, SprintIteration, SprintResultStatus } from "./entities/sprint-result.js";
export {
  SprintResultSchema,
  SprintIterationSchema,
  SprintResultStatusSchema,
  emptySprintResult,
} from "./entities/sprint-result.js";
