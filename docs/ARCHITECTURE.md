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
- **15 tools registered** in `agents/src/core/implemented-tools.ts`
- **7 fully implemented**: system-status, llm-router, knowledge-base, workflow-runner, org-kpi-dashboard, execution-map, market-intel
- **8 stubs** (return `{status: "not_implemented"}` for future implementation): talent-hub, finance-ledger, crm-insights, content-lab, support-hub, user-insights, data-lake, runbook
- **Per-agent tool filtering** via `selectToolsForAgent()` ensures agents only receive their declared tools
- **Module-level validation** throws on tool ID mismatches between the registry and tool implementations

## Evidence plane
- All decisions are tied to citations, KPIs, run artifacts, and vector-searchable evidence in Weaviate.
- Observability is enforced through run events and tooling logs.

## Code boundaries
- `apis/`: provider adapters and SDK wrappers
- `agents/`: agent definitions, skills, tools, and Mastra runtime
- `backend/`: orchestration API and runtime services (API gateway for agent runs)
- `database/`: Supabase schema, policies, and seed data
- `frontend/`: operator UI
