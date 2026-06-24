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

export class EvalSuiteNotFoundError extends DomainError {
  constructor(public readonly suiteId: string) {
    super(`Eval suite not found: ${suiteId}`);
    this.name = "EvalSuiteNotFoundError";
  }
}

export class EvalRunNotFoundError extends DomainError {
  constructor(public readonly runId: string) {
    super(`Eval run not found: ${runId}`);
    this.name = "EvalRunNotFoundError";
  }
}

export class ScorerUnavailableError extends DomainError {
  constructor(public readonly scorerKind: string) {
    super(`Scorer unavailable: ${scorerKind}`);
    this.name = "ScorerUnavailableError";
  }
}

export class EvalRegressionDetectedError extends DomainError {
  constructor(
    public readonly baselinePassRate: number,
    public readonly currentPassRate: number,
    public readonly thresholdPct: number,
  ) {
    super(
      `Eval regression detected: pass rate ${(currentPassRate * 100).toFixed(1)}% vs baseline ${(baselinePassRate * 100).toFixed(1)}% exceeds -${thresholdPct}% threshold`,
    );
    this.name = "EvalRegressionDetectedError";
  }
}

export class ApprovalNotFoundError extends DomainError {
  constructor(public readonly approvalId: string) {
    super(`Approval not found: ${approvalId}`);
    this.name = "ApprovalNotFoundError";
  }
}

export class ApprovalAlreadyDecidedError extends DomainError {
  constructor(
    public readonly approvalId: string,
    public readonly status: string,
  ) {
    super(`Approval ${approvalId} already decided (status=${status})`);
    this.name = "ApprovalAlreadyDecidedError";
  }
}

export class ApprovalExpiredError extends DomainError {
  constructor(public readonly approvalId: string) {
    super(`Approval ${approvalId} has expired`);
    this.name = "ApprovalExpiredError";
  }
}
