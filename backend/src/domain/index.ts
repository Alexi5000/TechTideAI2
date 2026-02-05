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

// Exceptions
export {
  DomainError,
  RunNotFoundError,
  InvalidStatusTransitionError,
  AgentNotFoundError,
  PersistenceUnavailableError,
  VectorStoreUnavailableError,
  EmbeddingProviderUnavailableError,
} from "./exceptions/index.js";

// Policies
export {
  StatusTransitionPolicy,
  defaultStatusTransitionPolicy,
} from "./policies/status-transition-policy.js";
export type { StatusTransitionRule } from "./policies/status-transition-policy.js";
