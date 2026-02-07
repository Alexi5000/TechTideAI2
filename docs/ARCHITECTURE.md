# Architecture

## Control plane
- Brian Cozy (CEO) + Veronica Cozy (Agent 0) + domain orchestrators define objectives, risks, and resource allocations.
- Decision logs map to measurable KPIs and dependencies.

## Execution plane
- Worker agents and automation workflows execute scoped tasks (five-worker pods per orchestrator).
- Worker pods are mapped to orchestrators in the agent registry for clear execution boundaries.
- Runs, events, artifacts, and knowledge documents are stored in Supabase for auditability.
- The in-memory agent registry is canonical for agent identity; the `agents` table is org-scoped configuration and enablement.
- Core tool access is shared across agents by default; strict mode limits execution to per-agent preferred tools (`MASTRA_TOOL_POLICY`).

## Tool system
- **17 tools registered** in `agents/src/core/tool-catalog.ts`
- **9 core tools** (shared across all agents): system-status, llm-router, knowledge-base, workflow-runner, org-kpi-dashboard, execution-map, market-intel, memory-recall, memory-store
- **8 stubs** (return `{status: "not_implemented"}` for future implementation): talent-hub, finance-ledger, crm-insights, content-lab, support-hub, user-insights, data-lake, runbook
- **Per-agent tool filtering** via `selectToolsForAgent()` ensures agents only receive their declared tools
- **Module-level validation** throws on tool ID mismatches between the registry and tool implementations

## Prompt management
- Template-based system in `agents/src/core/prompts/`
- `PromptTemplate` interface with `{{variable}}` interpolation and versioning
- `renderPrompt()` — drop-in replacement for hardcoded prompt construction
- Built-in `agent-system-v1` template; custom templates via `registerTemplate()`

## Evaluation framework
- Located in `agents/src/evaluation/`
- `EvalRunner` executes datasets against agents via `IAgentRuntime`
- Built-in scorers: exact-match, contains, json-schema, latency
- Sample datasets in `data/eval/`
- CLI: `tsx scripts/evaluate-agent.ts --dataset <path>`

## Memory system
- Short-term: `InMemoryShortTermMemory` — bounded per-session buffer in `agents/src/memory/`
- Long-term: `VectorLongTermMemory` — Weaviate-backed with `VectorStoreAdapter` interface
- Memory tools: `memory-recall` (search) and `memory-store` (persist) registered as core tools
- CLI: `tsx scripts/populate-memory.ts` / `tsx scripts/delete-memory.ts`

## Monitoring & observability
- `InMemoryTracer` — execution tracing with spans and events in `agents/src/monitoring/`
- `InMemoryMetrics` — counters and histograms for agent execution
- Instrumented in `createMastraRuntime({ tracer })` — optional, no-ops if not provided
- API: `GET /api/monitoring/metrics`, `GET /api/monitoring/traces`
- Swappable for OpenTelemetry in production

## Evidence plane
- All decisions are tied to citations, KPIs, run artifacts, and vector-searchable evidence in Weaviate.
- Observability is enforced through run events and tooling logs.

## CLI tools
Located in `scripts/`:
- `run-agent.ts` — Execute an agent from CLI
- `evaluate-agent.ts` — Run evaluation datasets
- `generate-eval-dataset.ts` — Generate datasets from agent definitions
- `populate-memory.ts` — Bulk load memory entries
- `delete-memory.ts` — Delete memory entries

## Code boundaries
- `apis/`: provider adapters and SDK wrappers
- `agents/`: agent definitions, skills, tools, evaluation, memory, monitoring, and Mastra runtime
- `backend/`: orchestration API and runtime services (API gateway for agent runs)
- `database/`: Supabase schema, policies, and seed data
- `frontend/`: operator UI
- `data/`: evaluation datasets and sample inputs
- `notebooks/`: Jupyter notebooks for interactive experimentation
- `scripts/`: CLI entrypoints for agent operations
