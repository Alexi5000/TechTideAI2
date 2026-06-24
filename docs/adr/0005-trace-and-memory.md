# ADR 0005, Trace and memory as the contract

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

"Logs that explain what happened" was another long-standing README promise. We had Fastify's request log and an unused `run_events` table. We needed a complete evidence plane that operators can query without writing a SQL query.

## Decision

Three surfaces, all versioned and contract-tested:

1. **Structured run events**, every state transition emits a `run_events` row of a fixed `RunEventType` (e.g. `run.started`, `agent.tool_call`, `approval.requested`). Each row carries `correlationId` (ties events to a trace), `severity`, and `occurredAt`. `GET /api/runs/:id/events` returns the full timeline.

2. **OpenTelemetry traces**, every `Run` gets a `trace_id`. Spans for HTTP request → run create → agent execute → tool call → LLM call. Defaults to in-process buffering; switches to OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. `GET /api/runs/:id/trace` returns the span tree.

3. **Mastra memory surface**, `agents/src/mastra/memory.ts` wires `Memory` against a Postgres store (`mastra_messages`, `mastra_working_memory`) when configured. Tier-scoped working-memory templates (CEO / orchestrator / worker).

A `PostMortemService` listens for `run.completed` and writes `docs/EVALS/post-mortems/<run-id>.md`. Engineers review runs by reading markdown, not by querying tables.

## Consequences

Positive:

- An investigator can move from "what happened in run X?" → "what events fired?" → "which spans were slow?" → "what's the post-mortem?" without leaving the codebase.
- Cross-session recall is on by default for orchestrator agents that opt in.
- The trace tree is the natural place to attach future cost-attribution work.

Negative:

- OTel SDK is loaded lazily, which means traces only work when `@opentelemetry/sdk-node` is installed. We document this clearly.
- The in-process trace buffer is fine for single-instance dev but isn't durable; production must use an OTLP collector.

## Alternatives considered

- **Langfuse-only.** Rejected: we want the trace tree to live in the same datastore as runs so we can correlate by `correlation_id` without a join across services.
- **No memory surface (rely on LLM context window only).** Rejected: orchestrator agents that run for hours need persistent state. Context-window stuffing is a band-aid.
