/**
 * Domain Exceptions - Error Hierarchy
 *
 * Domain-level errors that carry business meaning. Infrastructure
 * errors should be mapped to these before reaching use cases.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RunNotFoundError extends DomainError {
  constructor(public readonly runId: string) {
    super(`Run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {
    super(`Invalid status transition: ${fromStatus} -> ${toStatus}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class AgentNotFoundError extends DomainError {
  constructor(public readonly agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
  }
}

export class PersistenceUnavailableError extends DomainError {
  constructor(message = "Persistence layer unavailable") {
    super(message);
    this.name = "PersistenceUnavailableError";
  }
}

export class VectorStoreUnavailableError extends PersistenceUnavailableError {
  constructor(message = "Vector store unavailable") {
    super(message);
    this.name = "VectorStoreUnavailableError";
  }
}

export class EmbeddingProviderUnavailableError extends DomainError {
  constructor(message = "Embedding provider unavailable") {
    super(message);
    this.name = "EmbeddingProviderUnavailableError";
  }
}
