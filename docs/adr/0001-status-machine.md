# ADR 0001, Status machine as the execution boundary

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

We needed a way to describe what an agent run is *doing* at any moment, and a way to gate side-effects on those states. Two natural candidates:

1. A free-form `phase: string` field on `Run`. Cheap but unenforced.
2. A state machine with explicit transitions, enforced by a policy object.

We picked (2).

## Decision

The `Run.status` field is one of five values: `queued`, `running`, `succeeded`, `failed`, `canceled`. The `StatusTransitionPolicy` is the single source of truth for which transitions are legal. The `IRunService` consults the policy on every transition; invalid transitions throw `InvalidStatusTransitionError`.

The policy is **OCP-extensible**: `extend()` returns a new policy with additional rules; the original is never mutated. Phase 3 (approvals) added `running → awaiting-approval` and `awaiting-approval → {running, succeeded, failed, canceled}` without changing the default policy.

## Consequences

Positive:

- `Run.status` is queryable as an enum, every dashboard, alert, and audit query works off the same vocabulary.
- The state machine is the **execution boundary**: a side-effect is only legal in `running`, never in `queued`.
- Phase 3's HITL gate slotted in cleanly because the policy was already the seam.

Negative:

- Status migrations are not free. Renaming `canceled` → `cancelled` (or any other) requires a migration that touches the policy, the run events, and any dashboards that filter on the value.

## Alternatives considered

- **Event-sourced runs.** Rejected: too much ceremony for a system where most runs are < 30 seconds.
- **Per-framework state objects.** Rejected: the runtime abstraction (`IAgentRuntime`) needs to be framework-agnostic, so a shared schema is mandatory anyway.
