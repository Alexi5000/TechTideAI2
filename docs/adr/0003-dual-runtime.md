# ADR 0003, Dual runtime (TypeScript + Python)

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

We needed to choose between:

1. **Mastra-only**, single runtime, ergonomic for the worker hot path.
2. **LangGraph-only**, single runtime, strong for graph-heavy control flow.
3. **Dual runtime**, Mastra (TS) for workers, LangGraph (Python) for orchestrators.

## Decision

We picked (3). The contract (`IAgentRuntime`) is shared, defined once in `contracts/schema.json` and mirrored to both sides by `scripts/sync-contracts.ts`. A `Dispatcher` reads `agents/runtime_config.yaml` and decides which runtime to use per agent.

Default routing:

- Workers → Mastra (fast tool-call hot path).
- Orchestrators → LangGraph (deterministic compute layers, conditional HITL gates, multi-step plans).
- CEO → Mastra (configurable).

## Consequences

Positive:

- Workers stay fast. Orchestrators get graph primitives. Each runtime does what it's good at.
- The contract is the boundary, neither side leaks framework types into the other.
- Drift detection (`tests/test_contract_sync.py`) catches schema drift at CI time.

Negative:

- Two sets of dependencies. Two ways to fail. Two places to test.
- Ops needs to know about the Python sidecar (`LANGGRAPH_SIDECAR_URL`). If unset, the backend silently routes everything to Mastra, a "soft" failure mode we mitigate with a sidecar health check.

## Alternatives considered

- **Polyglot via WebAssembly** (Python in TS or vice versa). Rejected: adds a heavyweight runtime for a problem we don't have yet.
- **Single runtime with adapters.** Rejected: the abstractions we'd need to write are worse than the cost of running two runtimes.
