# ADR 0004, Approval as execution boundary

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

"Human approval where risk matters" was a long-standing README promise without a working implementation. We needed to convert it from aspiration to a real, demoable surface without slowing down low-risk actions.

## Decision

The `ApprovalPolicy` classifies every agent action into a `riskTier`:

- `read` / `write`, auto-approved.
- `external` / `destructive` / `billing`, paused for human approval.

The classification is heuristic (`defaultRiskClassifier`) and overridable per deployment. The `IAgentExecutionService` consults the policy on every `executeAgent`:

- Low-risk → run dispatches immediately (current behavior).
- High-risk → an `ApprovalRequest` is created and the run transitions to `awaiting-approval`. The originating agent pauses until an operator grants or denies via `/dashboard/approvals`.

The approval gate is **first-class** in the status machine, not a side-channel. `run.awaiting-approval` is a real state with explicit transitions back to `running` (on grant) or `failed` (on deny).

Every decision is recorded:

- `ApprovalRequest` with `decidedAt`, `decidedBy`, `rationale`.
- A `run_events` row of type `approval.requested`, `approval.granted`, or `approval.denied` for trace-tree visibility.
- An audit policy version (`approval-policy-v1`) on the row so historical decisions can be replayed against the policy in force at the time.

## Consequences

Positive:

- High-risk actions are visible, gated, and auditable. The queue is the system's risk surface.
- The default policy covers the obvious cases (payment, deletion, external API) without operator intervention.
- Approval replay is possible, you can ask "what would the policy in effect on 2026-06-01 have decided?" because the policy version is stamped.

Negative:

- Adds latency to high-risk actions. That's the point.
- A misconfigured policy can let bad actions through. Mitigated by defaulting the high-risk set to the obvious three.

## Alternatives considered

- **Org-level RBAC only.** Rejected: doesn't model "the same agent can read but not delete" cleanly.
- **Sandboxed tool execution.** Deferred. The approval gate is the first line; sandboxing is the second.
